import express from "express"
import cors from "cors"
import { runPipeline } from "./core/pipeline.engine"

const app = express()

app.use(cors())
app.use(express.json())

app.get("/", (req, res) => {
  res.json({ status: "OneAtlas Running 🚀" })
})

app.post("/generate", async (req, res) => {
  const result = await runPipeline(req.body)

  res.json({
    success: true,
    pipeline: result
  })
})

export default app