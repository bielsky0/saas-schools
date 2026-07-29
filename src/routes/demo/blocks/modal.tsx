import { StackIcon } from "@radix-ui/react-icons";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { builderProp, closestBlockProp, registerChaiBlock, registerChaiBlockProps, StylesProp } from "~/runtime";
import { ChaiBlock } from "~/types";
import { ChaiBlockComponentProps, ChaiStyles } from "~/types/blocks";

export type ModalProps = {
  children: React.ReactNode;
  styles: ChaiStyles;
  overlayStyles: ChaiStyles;
  show: boolean;
};

type ModalTriggerProps = {
  children: React.ReactNode;
  styles: ChaiStyles;
  content: string;
};

type ModalContentProps = {
  children: React.ReactNode;
  styles: ChaiStyles;
  show: boolean;
};

const ModalTriggerComponent = (props: ChaiBlockComponentProps<ModalTriggerProps>) => {
  const { blockProps, content, children, styles } = props;
  return (
    <DialogTrigger asChild>
      <div {...blockProps} {...styles}>
        {children || content}
      </div>
    </DialogTrigger>
  );
};

registerChaiBlock(ModalTriggerComponent, {
  type: "ModalTrigger",
  label: "Modal Trigger",
  group: "advanced",
  category: "core",
  hidden: true,
  canMove: () => false,
  canDelete: () => false,
  canAcceptBlock: () => true,
  canDuplicate: () => false,
  props: registerChaiBlockProps({
    properties: {
      styles: StylesProp("w-max"),
      content: {
        type: "string",
        title: "Content",
        default: "Edit Profile",
      },
    },
  }),
  i18nProps: ["content"],
  aiProps: ["content"],
});

const BuilderPortal = ({ children, show }: { children: any; show: boolean }) => {
  const container = document.getElementById("canvas-iframe");
  const width = container?.clientWidth;
  const height = container?.clientHeight;
  if (!show) return children;
  return (
    <div style={{ height, width }} className="absolute left-0 top-0 bg-black/80">
      <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-background">
        {children}
      </div>
    </div>
  );
};

const ModalContentComponent = (props: ChaiBlockComponentProps<ModalContentProps>) => {
  const { blockProps, children, styles, inBuilder, show } = props;

  if (inBuilder) {
    // * In builder showing children with a custom portal
    return (
      <BuilderPortal show={show}>
        <div {...blockProps} {...styles} style={{ display: show ? "block" : "none" }}>
          {children || "Modal Placeholder"}
        </div>
      </BuilderPortal>
    );
  }

  return (
    <DialogContent className="rounded-none border-none p-0 shadow-none sm:rounded-none">
      <div {...blockProps} {...styles}>
        {children || "Modal Placeholder"}
      </div>
    </DialogContent>
  );
};

registerChaiBlock(ModalContentComponent, {
  type: "ModalContent",
  label: "Modal Content",
  group: "advanced",
  hidden: true,
  canMove: () => false,
  canDelete: () => false,
  canAcceptBlock: () => true,
  canDuplicate: () => false,
  props: registerChaiBlockProps({
    properties: {
      styles: StylesProp("gap-4 border p-6 shadow-lg sm:rounded-lg"),
      show: closestBlockProp("Modal", "show"),
    },
  }),
});

const Component = (props: ChaiBlockComponentProps<ModalProps>) => {
  const { styles, children, blockProps, inBuilder } = props;

  return (
    <Dialog {...(inBuilder ? { open: false } : {})}>
      <div {...blockProps} {...styles}>
        {children}
      </div>
    </Dialog>
  );
};

const Config = {
  type: "Modal",
  label: "Modal",
  group: "advanced",
  description: "This is a modal block",
  category: "core",
  wrapper: true,
  icon: StackIcon,
  canAcceptBlock: (type: string) => type === "ModalTrigger" || type === "ModalContent",
  blocks: () =>
    [
      { _type: "Modal", _id: "modal" },
      {
        _type: "ModalTrigger",
        _id: "modal-trigger",
        _parent: "modal",
        content: "Edit Profile",
      },
      {
        _type: "ModalContent",
        _id: "modal-content",
        _parent: "modal",
      },
    ] as ChaiBlock[],
  props: registerChaiBlockProps({
    properties: {
      styles: StylesProp(""),
      show: builderProp({
        type: "boolean",
        title: "Open Modal",
        default: false,
      }),
    },
  }),
};

export { Component, Config };
