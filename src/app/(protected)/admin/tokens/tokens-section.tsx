import { fetchAccessTokens } from "@/features/tokens/token-queries";
import { TokensManager } from "./tokens-manager";

export const TokensSection = async () => {
  const tokens = await fetchAccessTokens();
  return <TokensManager initialTokens={tokens} />;
};
