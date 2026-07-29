/**
 * Typed Rain issuing API method functions over a RainRequester.
 *
 * Ported from the OSS demo; parametrized on an injected client (decision D1)
 * and the withdrawal poll's wait is injectable so tests never actually sleep.
 */

import type { RainRequester } from "./client";
import type {
  CardEncryptedDataResponse,
  CreateCardForUserRequest,
  CreateCardForUserResponse,
  CreateUserApplicationRequest,
  CreateUserApplicationResponse,
  TransactionResponse,
  UserCreditBalanceResponse,
  UserDepositContractResponse,
  UserWithdrawalRequest,
  UserWithdrawalSignatureRequest,
  UserWithdrawalSignatureResponse,
} from "./types";

export interface TransactionQueryParams {
  userId?: string;
  cardId?: string;
  cursor?: string;
  limit?: number; // 1 to 100, defaults to 20 on Rain's side
}

export interface WithdrawalSignatureOptions {
  maxRetries?: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

function isPending(
  response: UserWithdrawalSignatureResponse,
): response is Extract<UserWithdrawalSignatureResponse, { status: "pending" }> {
  return response.status === "pending";
}

export function createUserApplication(
  client: RainRequester,
  data: CreateUserApplicationRequest,
): Promise<CreateUserApplicationResponse> {
  return client.post<CreateUserApplicationRequest, CreateUserApplicationResponse>(
    "/v1/issuing/applications/user",
    data,
  );
}

export function createCardForUser(
  client: RainRequester,
  userId: string,
  data: CreateCardForUserRequest,
): Promise<CreateCardForUserResponse> {
  return client.post<CreateCardForUserRequest, CreateCardForUserResponse>(
    `/v1/issuing/users/${encodeURIComponent(userId)}/cards`,
    data,
  );
}

export function userCreditBalance(
  client: RainRequester,
  userId: string,
): Promise<UserCreditBalanceResponse> {
  return client.get<UserCreditBalanceResponse>(
    `/v1/issuing/users/${encodeURIComponent(userId)}/balances`,
  );
}

export function cardEncryptedData(
  client: RainRequester,
  cardId: string,
  sessionId: string,
): Promise<CardEncryptedDataResponse> {
  return client.get<CardEncryptedDataResponse>(
    `/v1/issuing/cards/${encodeURIComponent(cardId)}/secrets`,
    { SessionId: sessionId },
  );
}

export function createUserDepositContract(
  client: RainRequester,
  userId: string,
  chainId: number,
): Promise<UserDepositContractResponse> {
  return client.post<{ chainId: number }, UserDepositContractResponse>(
    `/v1/issuing/users/${encodeURIComponent(userId)}/contracts`,
    { chainId },
  );
}

export function userDepositContract(
  client: RainRequester,
  userId: string,
): Promise<UserDepositContractResponse[]> {
  return client.get<UserDepositContractResponse[]>(
    `/v1/issuing/users/${encodeURIComponent(userId)}/contracts`,
  );
}

export function transactions(
  client: RainRequester,
  params?: TransactionQueryParams,
): Promise<TransactionResponse[]> {
  const query = new URLSearchParams();
  if (params?.userId) query.set("userId", params.userId);
  if (params?.cardId) query.set("cardId", params.cardId);
  if (params?.cursor) query.set("cursor", params.cursor);
  if (params?.limit) query.set("limit", params.limit.toString());

  const qs = query.toString();
  return client.get<TransactionResponse[]>(
    `/v1/issuing/transactions${qs ? `?${qs}` : ""}`,
  );
}

export async function userWithdrawalSignature(
  client: RainRequester,
  userId: string,
  data: UserWithdrawalSignatureRequest,
  options?: WithdrawalSignatureOptions,
): Promise<UserWithdrawalRequest> {
  const maxRetries = options?.maxRetries ?? 10;
  const sleep = options?.sleep ?? defaultSleep;

  const query = new URLSearchParams();
  query.set("chainId", data.chainId.toString());
  query.set("token", data.token);
  query.set("amount", data.amount);
  query.set("adminAddress", data.adminAddress);
  query.set("recipientAddress", data.recipientAddress);

  const response = await client.get<UserWithdrawalSignatureResponse>(
    `/v1/issuing/users/${encodeURIComponent(userId)}/signatures/withdrawals?${query.toString()}`,
  );

  if (isPending(response)) {
    if (maxRetries <= 0) throw new Error("Maximum retry attempts reached");
    await sleep(response.retryAfter * 1000);
    return userWithdrawalSignature(client, userId, data, {
      maxRetries: maxRetries - 1,
      sleep,
    });
  }

  return response;
}
