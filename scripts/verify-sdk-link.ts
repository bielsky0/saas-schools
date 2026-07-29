import { registerChaiBlockSchema } from "@chaibuilder/sdk/runtime";

const type = typeof registerChaiBlockSchema;
console.log(`registerChaiBlockSchema type: ${type}`);

if (type === "function") {
  console.log("SDK link verification: OK");
} else {
  console.error("SDK link verification: FAILED");
  process.exit(1);
}
