const Utils = {};

function json_send(res, status_code, message, status, data, meta) {
  data = data || null;
  message = message || "";
  status = status || "success";

  const d = {
    status,
    message,
    data,
  };

  res.statusCode = status_code;
  if (process.env.ENVIRONMENT !== "test") {
    // Logger(res, {meta, message, data});
  }
  return res.status(status_code).json(d);
}

Utils.jsonS = (express_res, status_code = 200, message, data, meta) => {
  return json_send(express_res, status_code, message, "success", data, meta);
};

Utils.json401 = (express_res, data, message, error = {}) => {
  return json_send(express_res, 401, message, "error", data, error);
};

Utils.jsonFailed = (express_res, data, message, status_code = 400, meta) => {
  return json_send(express_res, status_code, message, "error", data, meta);
};

// Utils.internalRes =  (express_res, data, message, status_code = 200, meta = null)  {
//     return { success, data, message, status_code, meta };
// };
module.exports = Utils;
