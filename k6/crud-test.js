import http from 'k6/http';
import { check, sleep, group } from 'k6';

// DNS del ALB del despliegue real. Se puede sobreescribir con -e BASE_URL=...
const BASE_URL =
  __ENV.BASE_URL ||
  'http://parcial-valero-rincon-prod-alb-800812281.us-east-1.elb.amazonaws.com';

export const options = {
  vus: 5,
  duration: '45s',
  thresholds: {
    http_req_failed:   ['rate<0.50'],
    http_req_duration: ['p(95)<3000'],
  },
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
};

export default function () {
  let createdId = null;

  group('Create -> Read -> Update -> Delete', () => {
    const payload = JSON.stringify({
      name: `k6-product-${__VU}-${__ITER}`,
      description: 'Producto creado por k6',
      price: Math.round(Math.random() * 100000) + 1000,
      stock: Math.floor(Math.random() * 50),
    });
    const headers = { 'Content-Type': 'application/json' };
    const opts = { headers, timeout: '30s' };

    const create = http.post(`${BASE_URL}/api/products`, payload, opts);
    check(create, { 'POST 201': (r) => r.status === 201 });
    try {
      createdId = create.json().data.id;
    } catch (_) { /* ignore */ }

    if (createdId) {
      const getRes = http.get(`${BASE_URL}/api/products/${createdId}`, opts);
      check(getRes, { 'GET 200': (r) => r.status === 200 });

      const upd = http.put(
        `${BASE_URL}/api/products/${createdId}`,
        JSON.stringify({ price: 9999 }),
        opts
      );
      check(upd, { 'PUT 200': (r) => r.status === 200 });

      const del = http.del(`${BASE_URL}/api/products/${createdId}`, null, opts);
      check(del, { 'DELETE 200': (r) => r.status === 200 });
    }
  });

  sleep(1);
}
