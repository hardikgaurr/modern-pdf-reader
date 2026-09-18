import assert from "node:assert/strict";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createServer } from "node:http";
import test, { after, before } from "node:test";
import { createApp } from "./app.js";

interface JsonResponseBody {
  status?: string;
  error?: string;
}

const server = createServer(createApp());

let baseUrl = "";

before(async () => {
  server.listen(0, "127.0.0.1");

  await once(server, "listening");

  const address = server.address() as AddressInfo;

  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();

  await once(server, "close");
});

test("live health endpoint returns 200", async () => {
  const response = await fetch(`${baseUrl}/api/health/live`);

  assert.equal(response.status, 200);

  const body = (await response.json()) as JsonResponseBody;

  assert.equal(body.status, "ok");
});

test("unknown route returns 404", async () => {
  const response = await fetch(`${baseUrl}/api/not-found`);

  assert.equal(response.status, 404);

  const body = (await response.json()) as JsonResponseBody;

  assert.equal(body.error, "Route not found");
});

test("signup validates missing credentials", async () => {
  const response = await fetch(`${baseUrl}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
});

test("login validates missing credentials", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
});

test("refresh validates missing token", async () => {
  const response = await fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 400);
});

test("malformed JSON returns 400", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: '{"email":',
  });

  assert.equal(response.status, 400);

  const body = (await response.json()) as JsonResponseBody;

  assert.equal(body.error, "Invalid JSON body");
});

test("CORS allows the configured frontend origin", async () => {
  const response = await fetch(`${baseUrl}/api/health/live`, {
    headers: {
      Origin: "http://localhost:4200",
    },
  });

  assert.equal(response.status, 200);

  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "http://localhost:4200",
  );
});
