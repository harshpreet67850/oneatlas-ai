export async function runPipeline(input: any) {
  const result: any = {
    intent: null,
    schema: null,
    appspec: null,
    logs: []
  }

  // 🔵 INTENT STAGE
  result.logs.push("intent started")

  result.intent = {
    appName: "Demo App",
    type: "CRM",
    features: ["auth", "dashboard"]
  }

  result.logs.push("intent done")

  // 🔵 SCHEMA STAGE
  result.logs.push("schema started")

  result.schema = {
    entities: ["User", "Lead"],
    relations: ["User has Leads"]
  }

  result.logs.push("schema done")

  // 🔵 APPSPEC STAGE
  result.logs.push("appspec started")

  result.appspec = {
    pages: ["Login", "Dashboard"],
    apis: ["/login", "/leads"]
  }

  result.logs.push("appspec done")

  return result
}