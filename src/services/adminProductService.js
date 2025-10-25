const axios = require('axios');

const adminClient = axios.create({
  baseURL: process.env.ADMIN_SERVICE_URL,  
  timeout: 5000,
});

async function listProducts({ page, limit, search, category }) {
  const { data } = await adminClient.get('/products', {
    params: { page, limit, search, category }
  });
  return data.data;
}

async function getProduct(id) {
  const { data } = await adminClient.get(`/products/${id}`);
  return data.data;
}

async function listCategories() {
    const { data } = await adminClient.get("/categories");
    return data.data;
}

async function getCategory(id) {
    const { data } = await adminClient.get(`/categories/${id}`)
    return data.data;
}

module.exports = { listProducts, getProduct, listCategories, getCategory };
