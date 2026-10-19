const crypto = require("crypto");
const swaggerUi = require("swagger-ui-express");

/**
 * Serve the OpenAPI spec at /api-docs (UI) and /api-docs.json (raw spec).
 *
 * - Off in production unless SWAGGER_ENABLED=true.
 * - If SWAGGER_USER and SWAGGER_PASSWORD are set, the docs need HTTP basic auth.
 * The spec is only built when docs are enabled.
 */
function mountDocs(app, buildSpec) {
  const enabled =
    process.env.SWAGGER_ENABLED === "true" ||
    (process.env.SWAGGER_ENABLED !== "false" && process.env.NODE_ENV !== "production");
  if (!enabled) return;

  const spec = buildSpec();
  const guard = basicAuth(process.env.SWAGGER_USER, process.env.SWAGGER_PASSWORD);

  app.get("/api-docs.json", guard, (_req, res) => res.json(spec));
  app.use(
    "/api-docs",
    guard,
    swaggerUi.serve,
    swaggerUi.setup(spec, {
      customSiteTitle: spec.info.title,
      swaggerOptions: { persistAuthorization: true, docExpansion: "none", tagsSorter: "alpha" },
    }),
  );
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

function basicAuth(user, password) {
  if (!user || !password) return (_req, _res, next) => next();
  return (req, res, next) => {
    const [scheme, encoded] = String(req.get("Authorization") || "").split(" ");
    if (scheme === "Basic" && encoded) {
      const [u, ...rest] = Buffer.from(encoded, "base64").toString().split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), password)) return next();
    }
    res.set("WWW-Authenticate", 'Basic realm="API docs"');
    return res.status(401).send("Authentication required");
  };
}

module.exports = { mountDocs };
