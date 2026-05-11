"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  CheckCircle,
  UserPlus,
  ExternalLink,
  ChevronDown,
} from "lucide-react";
import { WidgetCard, Button, Input, Spinner } from "@dynamic-demos/ui";
import {
  getRecipientDisplayName,
  getRecipientInitials,
} from "@/lib/recipients";
import { ErrorMessage } from "@/components/ui/error-message";
import { useWalletAccounts } from "@/hooks/use-wallet-accounts";
import { useActiveNetwork } from "@/hooks/use-active-network";
import { useGasSponsorship } from "@/hooks/use-gas-sponsorship";
import { useUsdcBalance } from "@/hooks/use-usdc-balance";
import { useSendUsdcTransaction } from "@/hooks/use-mutations";
import {
  useRecipients,
  useAddRecipient,
  useResolveRecipient,
} from "@/hooks/use-recipients";
import { formatCurrency, truncateAddress } from "@dynamic-demos/utils";
import { isAddress } from "viem";
import { getBaseWalletForAddress } from "@/lib/wallet-utils";
import type { NavigationReturn } from "@/hooks/use-navigation";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const AVATAR_COLORS = [
  "bg-blue-500/20 text-blue-700",
  "bg-green-500/20 text-green-700",
  "bg-purple-500/20 text-purple-700",
  "bg-amber-500/20 text-amber-700",
  "bg-rose-500/20 text-rose-700",
] as const;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

interface SendScreenProps {
  walletAddress: string;
  navigation: NavigationReturn;
  /** Called when modal should be locked (sending/success) or unlocked */
  onLockModalChange?: (locked: boolean) => void;
  /** Called when send succeeds, e.g. to refresh balance and transaction history */
  onSendSuccess?: () => void;
  /** Server-fetched USDC balance for initial render. */
  initialUsdcBalance?: number;
  /** Known recipients from server metadata (avoids loading). */
  initialRecipients?: { email: string; address?: string }[];
  /** When provided, skip recipient step and start at amount with this recipient pre-selected. */
  initialRecipient?: { email: string; address?: string };
}

type SendStep = "recipient" | "amount" | "confirm" | "sending" | "success";

export function SendScreen({
  walletAddress,
  navigation,
  onLockModalChange,
  onSendSuccess,
  initialUsdcBalance,
  initialRecipients = [],
  initialRecipient,
}: SendScreenProps) {
  const { walletAccounts } = useWalletAccounts();
  const baseWallet = getBaseWalletForAddress(walletAddress, walletAccounts);
  const { networkData } = useActiveNetwork(baseWallet ?? null);
  const { walletToUse, isSponsored } = useGasSponsorship(
    walletAddress,
    walletAccounts,
    networkData,
  );

  const sendTx = useSendUsdcTransaction();
  const { balance: usdcBalance } = useUsdcBalance(walletAddress || undefined, {
    initialBalance: initialUsdcBalance,
  });
  const { recipients, isLoading: recipientsLoading } =
    useRecipients(initialRecipients);
  const addRecipient = useAddRecipient();
  const resolveRecipient = useResolveRecipient();

  // Lazy initial state: when initialRecipient has address, start at amount step
  const [step, setStep] = useState<SendStep>(() =>
    initialRecipient?.address ? "amount" : "recipient",
  );
  const [recipientLabel, setRecipientLabel] = useState(
    () => initialRecipient?.email ?? "",
  );
  const [recipientAddress, setRecipientAddress] = useState(
    () => initialRecipient?.address ?? "",
  );
  const [emailInput, setEmailInput] = useState(() =>
    initialRecipient && !initialRecipient.address ? initialRecipient.email : "",
  );
  const [addressInput, setAddressInput] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [contactSelectOpen, setContactSelectOpen] = useState(false);
  const contactSelectRef = useRef<HTMLDivElement>(null);

  const transitionStep = (newStep: SendStep) => {
    setStep(newStep);
    const locked = newStep === "sending" || newStep === "success";
    onLockModalChange?.(locked);
    if (newStep === "success") onSendSuccess?.();
  };

  useEffect(() => {
    if (!contactSelectOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contactSelectRef.current &&
        !contactSelectRef.current.contains(e.target as Node)
      ) {
        setContactSelectOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contactSelectOpen]);

  const handleSelectContact = async (email: string) => {
    setContactSelectOpen(false);
    const recipient = recipients.find((r) => r.email === email);
    if (recipient?.address) {
      setRecipientLabel(email);
      setRecipientAddress(recipient.address);
      transitionStep("amount");
      return;
    }
    try {
      const address = await resolveRecipient.mutateAsync(email);
      setRecipientLabel(email);
      setRecipientAddress(address);
      transitionStep("amount");
    } catch {
      // Error shown via resolveRecipient.error (legacy recipients without cached address)
    }
  };

  const handleAddByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = emailInput.trim().toLowerCase();
    if (!email || !isValidEmail(email)) return;

    try {
      const result = await addRecipient.mutateAsync(email);
      let address = result.address;
      if (!address) {
        address = await resolveRecipient.mutateAsync(email);
      }
      setRecipientLabel(email);
      setRecipientAddress(address);
      setEmailInput("");
      transitionStep("amount");
    } catch {
      // Error shown via addRecipient.error or resolveRecipient.error
    }
  };

  const handleUseAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const input = addressInput.trim();
    if (!input || !isAddress(input)) return;

    setRecipientLabel(truncateAddress(input));
    setRecipientAddress(input);
    setAddressInput("");
    transitionStep("amount");
  };

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    transitionStep("confirm");
  };

  const handleConfirm = async () => {
    if (!walletToUse || !networkData || !recipientAddress) return;
    transitionStep("sending");

    try {
      const hash = await sendTx.mutateAsync({
        walletAccount: walletToUse,
        amount,
        recipient: recipientAddress,
        networkData,
      });
      setTxHash(hash);
      transitionStep("success");
    } catch (error) {
      console.error("[Send] Transaction error:", error);
      transitionStep("confirm");
    }
  };

  if (step === "sending") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <Spinner size="lg" />
          <p className="text-sm text-(--brand-muted)">Sending USDC...</p>
        </div>
      </WidgetCard>
    );
  }

  if (step === "success") {
    return (
      <WidgetCard>
        <div className="flex flex-col items-center text-center py-6 px-6 gap-4">
          <div
            className="w-20 h-20 rounded-full bg-(--brand-success)/10 flex items-center justify-center animate-in zoom-in-95 duration-300"
            aria-hidden
          >
            <CheckCircle className="w-10 h-10 text-(--brand-success)" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-(--brand-fg)">
              Transfer Complete
            </h2>
            <p className="text-sm text-(--brand-muted)">
              {formatCurrency(amount, { symbol: true })} USDC sent
            </p>
          </div>
          <div className="flex flex-row gap-4 w-full">
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 h-10 px-3 text-sm font-medium text-(--brand-accent) bg-(--brand-accent)/5 rounded-(--brand-radius) hover:bg-(--brand-accent)/10 transition-colors"
              >
                View on Explorer
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Button
              className="flex-1"
              onClick={navigation.goToDashboard}
              size="lg"
            >
              Close
            </Button>
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard
      icon={
        <Send
          className="w-[18px] h-[18px] text-(--brand-fg)"
          strokeWidth={1.5}
        />
      }
      title="Send USDC"
      subtitle={
        step === "recipient"
          ? "Select or add contact"
          : step === "amount"
            ? "Enter amount"
            : "Review & confirm"
      }
      onBack={
        step === "recipient"
          ? undefined
          : () => {
              if (step === "amount") transitionStep("recipient");
              else if (step === "confirm") transitionStep("amount");
              else navigation.goToDashboard();
            }
      }
    >
      {step === "recipient" && (
        <div className="space-y-4">
          {recipientsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : (
            <>
              {/* Contact select + add new */}
              <div className="space-y-3">
                {recipients.length > 0 && (
                  <div ref={contactSelectRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setContactSelectOpen((open) => !open)}
                      disabled={resolveRecipient.isPending}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-(--brand-border) bg-white text-left cursor-pointer hover:bg-(--brand-row-bg) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-sm text-(--brand-muted)">
                        Select a contact
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-(--brand-muted) transition-transform ${
                          contactSelectOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {contactSelectOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 z-10 rounded-lg border border-(--brand-border) bg-white shadow-lg overflow-hidden">
                        <div className="max-h-48 overflow-y-auto divide-y divide-(--brand-border)">
                          {recipients.map((contact, index) => (
                            <button
                              key={contact.email}
                              type="button"
                              onClick={() => handleSelectContact(contact.email)}
                              disabled={resolveRecipient.isPending}
                              className="w-full flex items-center gap-3 px-3 py-2.5 text-left cursor-pointer hover:bg-(--brand-row-hover) transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <div
                                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                                  AVATAR_COLORS[index % AVATAR_COLORS.length]
                                }`}
                              >
                                {contact.avatarUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element -- external avatar URLs
                                  <img
                                    src={contact.avatarUrl}
                                    alt=""
                                    className="w-full h-full rounded-full object-cover"
                                  />
                                ) : (
                                  getRecipientInitials(contact)
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-(--brand-fg) truncate">
                                  {getRecipientDisplayName(contact)}
                                </p>
                                <p className="text-xs text-(--brand-muted) truncate">
                                  {contact.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <form onSubmit={handleAddByEmail} className="flex gap-2">
                  <Input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="contact@example.com"
                    autoComplete="email"
                    autoFocus={recipients.length === 0}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      !isValidEmail(emailInput.trim()) ||
                      addRecipient.isPending ||
                      resolveRecipient.isPending
                    }
                    loading={
                      addRecipient.isPending || resolveRecipient.isPending
                    }
                  >
                    <UserPlus className="w-4 h-4" />
                    Add
                  </Button>
                </form>
              </div>

              {/* Or separator */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-(--brand-border)" />
                <span className="text-sm text-(--brand-muted) font-medium">
                  or
                </span>
                <div className="flex-1 h-px bg-(--brand-border)" />
              </div>

              {/* Wallet address */}
              <form onSubmit={handleUseAddress} className="space-y-2">
                <Input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter wallet address"
                  autoComplete="off"
                  className="font-mono"
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!isAddress(addressInput.trim())}
                >
                  Continue
                </Button>
              </form>
            </>
          )}
          <ErrorMessage error={addRecipient.error ?? resolveRecipient.error} />
        </div>
      )}

      {step === "amount" && (
        <form onSubmit={handleAmountSubmit} className="space-y-4">
          <div className="flex justify-between items-center p-2.5 rounded-lg bg-(--brand-row-bg)">
            <span className="text-xs font-medium text-(--brand-muted)">
              To
            </span>
            <span className="text-sm text-(--brand-fg) font-mono truncate">
              {recipientLabel}
            </span>
          </div>
          <div>
            <Input
              label="Amount (USDC)"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
            />
            <p className="text-xs text-(--brand-muted) mt-1">
              Available: {formatCurrency(usdcBalance)} USDC
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={!amount || parseFloat(amount) <= 0}
          >
            Continue
          </Button>
        </form>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <div className="space-y-2 p-3 rounded-(--brand-radius) bg-(--brand-row-bg)">
            <div className="flex justify-between text-sm">
              <span className="text-(--brand-muted)">To</span>
              <span className="text-(--brand-fg) font-mono truncate">
                {recipientLabel}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--brand-muted)">Amount</span>
              <span className="font-medium">{formatCurrency(amount)} USDC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--brand-muted)">Network</span>
              <span>Base Sepolia</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-(--brand-muted)">Gas Fee</span>
              <span className={isSponsored ? "text-(--brand-success)" : ""}>
                {isSponsored ? "Sponsored" : "User pays"}
              </span>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={handleConfirm}
            loading={sendTx.isPending}
            disabled={!walletToUse || !networkData}
          >
            Confirm & Send
          </Button>
          <ErrorMessage error={sendTx.error} />
        </div>
      )}
    </WidgetCard>
  );
}
