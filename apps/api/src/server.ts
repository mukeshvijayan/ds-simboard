import { createApp } from "./app";
import { createProductionDatabase } from "./db/client";

const port = process.env.PORT ?? 3001;
const db = createProductionDatabase(process.env.DATABASE_URL);
const app = createApp(db);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`apps/api listening on port ${port}`);
});
