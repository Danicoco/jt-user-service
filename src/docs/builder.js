/**
 * Small helpers for writing the OpenAPI spec as data.
 *
 * Every operation is declared with example request/response bodies; the JSON
 * schemas are inferred from those examples so the samples shown in Swagger UI
 * and the documented shapes can't drift apart.
 */

const SECURITY = {
  user: [{ bearerAuth: [] }],
  admin: [{ bearerAuth: [] }],
  internal: [{ internalKey: [] }],
  none: [],
};

/** Infer a JSON schema from an example value. */
function schemaOf(value) {
  if (value === null || value === undefined) return { nullable: true };
  if (Array.isArray(value)) {
    return { type: "array", items: value.length ? schemaOf(value[0]) : {} };
  }
  switch (typeof value) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: Number.isInteger(value) ? "integer" : "number" };
    case "boolean":
      return { type: "boolean" };
    case "object": {
      const properties = {};
      for (const [k, v] of Object.entries(value)) properties[k] = schemaOf(v);
      return { type: "object", properties };
    }
    default:
      return {};
  }
}

/** Standard success envelope used by jsonS(). */
const ok = (message, data = null) => ({ status: "success", message, data });

/** Standard error envelope used by jsonFailed(). */
const fail = (message, data = {}) => ({ status: "error", message, data });

/** Attach a description to a response example. */
const DESCRIBED = Symbol("described");
const described = (description, example) => ({ [DESCRIBED]: true, description, example });

const STATUS_TEXT = {
  200: "OK",
  201: "Created",
  400: "Bad request / validation error",
  401: "Unauthorised (bad PIN or token)",
  403: "Forbidden / missing or invalid token",
  404: "Not found",
  409: "Conflict",
  410: "Gone (expired)",
  429: "Too many requests",
  500: "Server error",
  502: "Upstream provider error",
  503: "Service unavailable",
};

function toParams(location, spec = {}) {
  return Object.entries(spec).map(([name, v]) => {
    const p = v && typeof v === "object" && !Array.isArray(v) && "example" in v ? v : { example: v };
    return {
      name,
      in: location,
      required: location === "path" ? true : Boolean(p.required),
      description: p.description,
      schema: p.enum ? { type: "string", enum: p.enum } : schemaOf(p.example),
      example: p.example,
    };
  });
}

/**
 * Declare one operation.
 * @param {string} method get | post | patch | put | delete
 * @param {string} path express-style path relative to /api/v1 (":id" is fine)
 * @param {Object} o
 * @param {string} o.tag
 * @param {string} o.summary
 * @param {string} [o.description]
 * @param {"user"|"admin"|"internal"|"none"} [o.auth="user"]
 * @param {Object} [o.body] example JSON body
 * @param {string[]} [o.required] required body fields
 * @param {Object} [o.form] example multipart fields; file fields given as "<file>"
 * @param {Object} [o.query] { name: example | { example, required, description, enum } }
 * @param {Object} [o.params] path param examples
 * @param {Object} [o.headers] header param examples
 * @param {Object} o.responses { status: exampleBody | described(text, exampleBody) }
 */
function route(method, path, o) {
  const oaPath = path.replace(/:(\w+)/g, "{$1}");
  const pathParamNames = [...path.matchAll(/:(\w+)/g)].map((m) => m[1]);
  const params = { ...Object.fromEntries(pathParamNames.map((n) => [n, "string"])), ...(o.params || {}) };

  const op = {
    tags: [o.tag],
    summary: o.summary,
    ...(o.description && { description: o.description }),
    security: SECURITY[o.auth || "user"],
    parameters: [
      ...toParams("path", params),
      ...toParams("query", o.query),
      ...toParams("header", o.headers),
    ],
    responses: {},
  };

  if (o.body) {
    const schema = schemaOf(o.body);
    if (o.required) schema.required = o.required;
    op.requestBody = {
      required: true,
      content: { "application/json": { schema, example: o.body } },
    };
  } else if (o.form) {
    const properties = {};
    for (const [k, v] of Object.entries(o.form)) {
      properties[k] =
        v === "<file>" ? { type: "string", format: "binary" } : { ...schemaOf(v), example: v };
    }
    op.requestBody = {
      required: true,
      content: {
        "multipart/form-data": {
          schema: { type: "object", properties, ...(o.required && { required: o.required }) },
        },
      },
    };
  }

  for (const [status, r] of Object.entries(o.responses)) {
    const isWrapped = Boolean(r && r[DESCRIBED]);
    const example = isWrapped ? r.example : r;
    op.responses[status] = {
      description: (isWrapped && r.description) || STATUS_TEXT[status] || "Response",
      content: { "application/json": { schema: schemaOf(example), example } },
    };
  }

  return { path: oaPath, method, op };
}

/** Assemble an OpenAPI document from route() entries. */
function buildSpec({ info, tags, routes, internalKeyHeader = "x-internal-key" }) {
  const paths = {};
  for (const { path, method, op } of routes) {
    paths[path] = paths[path] || {};
    paths[path][method] = op;
  }
  return {
    openapi: "3.0.3",
    info,
    servers: [{ url: "/api/v1", description: "This server" }],
    tags,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        internalKey: {
          type: "apiKey",
          in: "header",
          name: internalKeyHeader,
          description: "Shared secret for service-to-service calls (INTERNAL_SECRET). Never expose to clients.",
        },
      },
    },
    paths,
  };
}

module.exports = { route, ok, fail, described, buildSpec, schemaOf };
