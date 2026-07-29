import {
  Component as CollectionListComponent,
  Config as CollectionListConfig,
} from "~/routes/demo/blocks/collection-list";
import { Component as ModalComponent, Config as ModalConfig } from "~/routes/demo/blocks/modal";
import { registerChaiBlock } from "~/runtime";
import { ChaiBlockComponentProps, ChaiBlockConfig } from "~/types/blocks";

const PaginationComponent = (props: ChaiBlockComponentProps<any>) => {
  console.log(props);
  return <div>Pagination New </div>;
};

const PaginationConfig: ChaiBlockConfig = {
  type: "Pagination",
  label: "Pagination",
  icon: "",
  group: "basic",
  hidden: true,
  canAcceptBlock: () => true,
  canDelete: () => false,
  canMove: () => false,
  canDuplicate: () => false,
};

export default function registerCustomBlocks() {
  registerChaiBlock(CollectionListComponent, CollectionListConfig);
  registerChaiBlock(ModalComponent, ModalConfig);
  registerChaiBlock(PaginationComponent, PaginationConfig);
}
