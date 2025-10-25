const cloudinary = require("cloudinary").v2;

const cloudConfig = (req, res, next) => {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });

    next();
};

const cloudinaryUpload = (req, res, next) => {
    if (!req.files || !req.files.cardImage) {
        console.error("Error uploading image to Cloudinary: No file uploaded");
        return next(new Error("No file uploaded"));
    }

    const cardImage = req.files.cardImage;

    cloudinary.uploader.upload_stream({ resource_type: "image", folder: "Gift Cards" },
        (error, result) => {
            if (error) {
                console.error("Error uploading image to Cloudinary:", error);
                return next(error);
            }
            req.body.cloudinaryUrl = result.secure_url;
            next();
        })
        .end(cardImage.data);
};

function uploadSingle(file, folder = "products") {
  return new Promise((resolve, reject) => {
    const opts = { resource_type: "image", folder };
    if (file.tempFilePath) {
      cloudinary.uploader.upload(file.tempFilePath, opts)
        .then(resolve)
        .catch(reject);
    } else if (file.data) {
      const stream = cloudinary.uploader.upload_stream(opts, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
      stream.end(file.data);
    } else {
      reject(new Error("No file data found"));
    }
  });
}

async function cloudinaryUploadMultiple(req, res, next) {
  try {
    const incoming = req.files?.product_image || req.files?.category_image;
    if (!incoming) {
      req.body.imageUrls = [];
      return next();
    }

    const files = Array.isArray(incoming) ? incoming : [incoming];
    if (files.length > 4) {
      return next(new Error("You can upload up to 4 images"));
    }

    const results = await Promise.all(files.map(uploadSingle));
    req.body.imageUrls = results.map(r => r.secure_url);
    next();
  } catch (err) {
    console.error("Cloudinary multiple upload error:", err);
    next(err);
  }
}

function uploadField(fieldName, folder = "admin-avatars") {
  return async (req, res, next) => {
    if (!req.files || !req.files[fieldName]) return next();
    try {
      const result = await uploadSingle(req.files[fieldName], folder);
      console.log({ result });
      if (!req.body) req.body = {};
      req.body.photoUrl = result.secure_url;
      next();
    } catch (err) {
      console.error(`Error uploading ${fieldName}:`, err);
      next(err);
    }
  };
}


module.exports = {
    cloudConfig,
    cloudinaryUpload,
    cloudinaryUploadMultiple,
    uploadField
};

