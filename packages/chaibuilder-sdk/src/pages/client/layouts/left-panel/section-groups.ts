export type SectionGroupId = "header" | "template" | "footer";

export interface SectionTreeNode {
  _id: string;
  _type?: string;
  _name?: string;
  children?: SectionTreeNode[];
  [key: string]: unknown;
}

export interface SectionGroup {
  id: SectionGroupId;
  labelKey: string;
  nodes: SectionTreeNode[];
}

export const SECTION_GROUP_RULES: Record<Exclude<SectionGroupId, "template">, string[]> = {
  header: ["Navbar", "Header", "Nav", "Navigation", "StickyHeader", "Announcement"],
  footer: ["Footer", "FooterNav", "FooterBottom"],
};

export const SECTION_GROUP_LABELS: Record<SectionGroupId, string> = {
  header: "Header",
  template: "Template",
  footer: "Footer",
};

const matchesAnyRule = (node: SectionTreeNode, rules: string[]): boolean => {
  if (rules.length === 0) return false;
  const haystack = `${node?._type ?? ""} ${node?._name ?? ""}`.toLowerCase();
  return rules.some((rule) => haystack.includes(rule.toLowerCase()));
};

export const groupSections = (nodes: SectionTreeNode[]): SectionGroup[] => {
  const buckets: Record<SectionGroupId, SectionTreeNode[]> = {
    header: [],
    template: [],
    footer: [],
  };

  for (const node of nodes) {
    if (matchesAnyRule(node, SECTION_GROUP_RULES.header)) {
      buckets.header.push(node);
    } else if (matchesAnyRule(node, SECTION_GROUP_RULES.footer)) {
      buckets.footer.push(node);
    } else {
      buckets.template.push(node);
    }
  }

  return (["header", "template", "footer"] as SectionGroupId[]).map((id) => ({
    id,
    labelKey: SECTION_GROUP_LABELS[id],
    nodes: buckets[id],
  }));
};

export const filterSections = (nodes: SectionTreeNode[], query: string): SectionTreeNode[] => {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;

  const filterTree = (list: SectionTreeNode[]): SectionTreeNode[] => {
    const result: SectionTreeNode[] = [];
    for (const node of list) {
      const children = node.children ? filterTree(node.children) : [];
      const haystack = `${node?._type ?? ""} ${node?._name ?? ""}`.toLowerCase();
      if (haystack.includes(q) || children.length > 0) {
        result.push({ ...node, children });
      }
    }
    return result;
  };

  return filterTree(nodes);
};

export const isSectionOverridden = (
  node: SectionTreeNode,
  defaultProps: Record<string, unknown> = {},
): boolean => {
  const props = (node.props ?? {}) as Record<string, unknown>;
  const background = node.background ?? props.background;
  if (background) return true;

  const className = node.className ?? props.className;
  if (typeof className !== "string" || !className.trim()) return false;
  return className.trim() !== (defaultProps?.className ?? "");
};
