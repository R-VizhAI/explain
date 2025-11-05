import { connectDB } from "../src/app/config/connectDB";
import app from './app';
import config from './app/config';

(async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Server listening on port http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to connect DB or start server:', err);
    process.exit(1);
  }
})();