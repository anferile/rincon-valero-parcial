import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const BASE_URL =
  __ENV.BASE_URL ||
  "http://parcial-valero-rincon-prod-alb-800812281.us-east-1.elb.amazonaws.com";

const errorRate = new Rate("custom_errors");

export const options = {
  stages: [
    { duration: "30s", target: 20 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"],
    http_req_failed: ["rate<0.10"],
    custom_errors: ["rate<0.10"],
  },
  noConnectionReuse: false,
  insecureSkipTLSVerify: true,
};

export default function () {
  const res = http.get(`${BASE_URL}/health`, {
    timeout: "30s",
    tags: { endpoint: "health" },
  });

  const ok = check(res, {
    "status 200": (r) => r.status === 200,
    "json tiene status": (r) => {
      try {
        return r.json().status === "ok";
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!ok);
  sleep(1);
}
