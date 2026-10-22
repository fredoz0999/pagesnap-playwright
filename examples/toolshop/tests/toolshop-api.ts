/** Thin client for the Toolshop REST API used to cross-check the UI. */
import { expect, type APIRequestContext } from "@playwright/test";

export const API = process.env.TOOLSHOP_API || "https://api.practicesoftwaretesting.com";

export interface Product { id: string; name: string; price: number }
export interface Customer { email: string; password: string; first: string; last: string }

export class ToolshopApi {
  private token = "";
  constructor(private readonly request: APIRequestContext) {}

  private get auth() {
    return { Accept: "application/json", ...(this.token ? { Authorization: "Bearer " + this.token } : {}) };
  }

  async register(c: Customer): Promise<void> {
    const r = await this.request.post(API + "/users/register", {
      headers: this.auth,
      data: {
        first_name: c.first, last_name: c.last, phone: "5550100", dob: "1990-01-01", email: c.email, password: c.password,
        address: { street: "1 Test Way", city: "Chantilly", state: "VA", country: "US", postal_code: "20151" },
      },
    });
    expect(r.status(), await r.text()).toBe(201);
  }

  async login(email: string, password: string): Promise<number> {
    const r = await this.request.post(API + "/users/login", { headers: { Accept: "application/json" }, data: { email, password } });
    if (r.ok()) this.token = (await r.json()).access_token;
    return r.status();
  }

  async search(q: string): Promise<{ total: number; data: Product[] }> {
    const r = await this.request.get(API + "/products/search", { params: { q, page: 1 }, headers: this.auth });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }

  async productsSorted(q: string, sort: string): Promise<Product[]> {
    const r = await this.request.get(API + "/products", { params: { q, sort, page: 1 }, headers: this.auth });
    expect(r.ok()).toBeTruthy();
    return (await r.json()).data;
  }

  async product(id: string): Promise<Product> {
    const r = await this.request.get(API + "/products/" + id, { headers: this.auth });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }

  async cart(id: string): Promise<{ cart_items: { quantity: number; product: Product }[] }> {
    const r = await this.request.get(API + "/carts/" + id, { headers: this.auth });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }

  async invoices(): Promise<{ id: string; invoice_number: string; total: number }[]> {
    const r = await this.request.get(API + "/invoices", { headers: this.auth });
    expect(r.ok(), await r.text()).toBeTruthy();
    return (await r.json()).data;
  }

  async invoice(id: string): Promise<{
    invoice_number: string; total: number; billing_street: string; billing_city: string; billing_postal_code: string;
    invoicelines: { product_id: string; quantity: number; unit_price: number }[];
  }> {
    const r = await this.request.get(API + "/invoices/" + id, { headers: this.auth });
    expect(r.ok(), await r.text()).toBeTruthy();
    return r.json();
  }
}
