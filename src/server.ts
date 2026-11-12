import 'dotenv/config';
import { app } from './app.js';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`UniPulse server running on http://localhost:${PORT}`);
});
