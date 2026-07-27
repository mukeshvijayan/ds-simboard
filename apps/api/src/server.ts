import { createApp } from "./app";
import { createProductionDatabase } from "./db/client";

const port = process.env.PORT ?? 3001;
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error(
    "SESSION_SECRET is required to sign session cookies — see docs/architecture/0010-*.md"
  );
}

const db = createProductionDatabase(process.env.DATABASE_URL);
const app = createApp(db, sessionSecret);

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`apps/api listening on port ${port}`);
});
