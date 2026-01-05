import { Mastra } from "@mastra/core";
import { fieldMateAgent } from "./agents/field-mate-agent";

export const mastra = new Mastra({
  agents: {
    fieldMate: fieldMateAgent,
  },
});

export { fieldMateAgent };
