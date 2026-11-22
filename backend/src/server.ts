import app from './app';

const PORT = 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BACKEND DEBUG] Auto Video Generator API running at http://localhost:${PORT}`);
});

app.use((req, res, next) => {
  console.log(`[BACKEND DEBUG] Incoming Request: ${req.method} ${req.url} from origin ${req.headers.origin}`);
  next();
});
