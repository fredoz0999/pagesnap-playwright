/** Thin client for the Parabank REST API used to cross-check the UI. */
import { expect, type APIRequestContext } from "@playwright/test";

export interface Account { id: number; customerId: number; type: string; balance: number }
export interface Transaction { id: number; accountId: number; type: string; amount: number; description: string }

const API = "/parabank/services/bank";
const json = { Accept: "application/json" };

export class ParabankApi {
  constructor(private readonly request: APIRequestContext) {}

  async login(username: string, password: string): Promise<{ id: number; firstName: string }> {
    const r = await this.request.get(`${API}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`, { headers: json });
    expect(r.status(), await r.text()).toBe(200);
    return r.json();
  }

  async loginStatus(username: string, password: string): Promise<number> {
    const r = await this.request.get(`${API}/login/${encodeURIComponent(username)}/${encodeURIComponent(password)}`, { headers: json });
    return r.status();
  }

  async accounts(customerId: number): Promise<Account[]> {
    const r = await this.request.get(`${API}/customers/${customerId}/accounts`, { headers: json });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }

  async account(id: number): Promise<Account> {
    const r = await this.request.get(`${API}/accounts/${id}`, { headers: json });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }

  async transfer(fromAccountId: number, toAccountId: number, amount: number): Promise<string> {
    const r = await this.request.post(`${API}/transfer`, { params: { fromAccountId, toAccountId, amount }, headers: json });
    expect(r.status(), await r.text()).toBe(200);
    return r.text();
  }

  async transactionsByAmount(accountId: number, amount: number): Promise<Transaction[]> {
    const r = await this.request.get(`${API}/accounts/${accountId}/transactions/amount/${amount}`, { headers: json });
    expect(r.ok()).toBeTruthy();
    return r.json();
  }
}
