"use client";

import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/button";
import { Panel } from "@/components/panel";
import { Body } from "@/components/typography";
import type {
  AccessTokenDto,
  AccessTokenPermission as AccessTokenPermissionValue,
  AccessTokenWithSecretDto,
} from "@/features/tokens/token-types";
import {
  ACCESS_TOKEN_PERMISSION_LABELS,
  AccessTokenPermissions,
} from "@/features/tokens/token-types";

type TokensManagerProps = {
  initialTokens: readonly AccessTokenDto[];
};

type ApiErrorBody = {
  detail?: string;
};

type CreateTokenResponse = {
  token: string;
  accessToken: AccessTokenDto;
};

const formatTimestamp = (value: string | null): string => {
  if (!value) {
    return "Never used";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const sortTokens = (tokens: readonly AccessTokenDto[]): AccessTokenDto[] =>
  [...tokens].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );

const formatPermissions = (
  permissions: readonly AccessTokenPermissionValue[],
): string => {
  if (permissions.length === 0) {
    return "None";
  }

  return permissions
    .map((permission) => ACCESS_TOKEN_PERMISSION_LABELS[permission])
    .join(", ");
};

export const TokensManager = ({ initialTokens }: TokensManagerProps) => {
  const [tokens, setTokens] = useState<AccessTokenDto[]>(() =>
    sortTokens(initialTokens),
  );
  const [label, setLabel] = useState("");
  const [permissions, setPermissions] = useState<AccessTokenPermissionValue[]>(
    [],
  );
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [latestToken, setLatestToken] =
    useState<AccessTokenWithSecretDto | null>(null);
  const [deleting, setDeleting] = useState<Set<string>>(() => new Set());
  const [deletionError, setDeletionError] = useState<string | null>(null);

  const hasTokens = tokens.length > 0;

  const handleCreateToken = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextLabel = label.trim();
    if (nextLabel.length === 0) {
      setCreationError("Provide a descriptive label before creating a token.");
      return;
    }

    setIsCreating(true);
    setCreationError(null);
    setDeletionError(null);

    try {
      const response = await fetch("/api/tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label: nextLabel,
          permissions,
        }),
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        setCreationError(
          body?.detail ?? "Failed to create access token. Try again shortly.",
        );
        return;
      }

      const body = (await response.json()) as CreateTokenResponse;

      const newToken: AccessTokenDto = body.accessToken;
      setTokens((current) => sortTokens([newToken, ...current]));
      setLatestToken({
        ...body.accessToken,
        token: body.token,
      });
      setLabel("");
      setPermissions([]);
    } catch (error) {
      console.error("access_token_create_ui_failed", error);
      setCreationError("Unexpected error while creating token.");
    } finally {
      setIsCreating(false);
    }
  };

  const removeDeleting = (id: string) =>
    setDeleting((current) => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });

  const handleDeleteToken = async (id: string) => {
    const isAlreadyDeleting = deleting.has(id);
    if (isAlreadyDeleting) {
      return;
    }

    setDeletionError(null);
    setDeleting((current) => new Set(current).add(id));

    try {
      const response = await fetch(`/api/tokens/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        setDeletionError(
          body?.detail ?? "Failed to delete token. Please try again.",
        );
        return;
      }

      setTokens((current) => current.filter((token) => token.id !== id));

      setLatestToken((current) => {
        if (current?.id === id) {
          return null;
        }
        return current;
      });
    } catch (error) {
      console.error("access_token_delete_ui_failed", error);
      setDeletionError("Unexpected error while deleting token.");
    } finally {
      removeDeleting(id);
    }
  };

  const copyButtonLabel = useMemo(() => {
    if (!latestToken) {
      return "Copy token";
    }
    return `Copy ${latestToken.label} token`;
  }, [latestToken]);

  const handlePermissionChange =
    (permission: AccessTokenPermissionValue) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      setPermissions((current) => {
        if (isChecked) {
          if (current.includes(permission)) {
            return current;
          }
          return [...current, permission].sort((left, right) =>
            left.localeCompare(right),
          );
        }

        return current.filter((value) => value !== permission);
      });
    };

  const hasAdministratorPermission = permissions.includes(
    AccessTokenPermissions.Administrator,
  );

  const handleCopyToken = async () => {
    if (!latestToken) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestToken.token);
    } catch (error) {
      console.error("access_token_copy_ui_failed", error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Panel
        as="form"
        onSubmit={handleCreateToken}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor="access-token-label"
            className="text-sm font-medium text-slate-800 dark:text-slate-200"
          >
            Token label
          </label>
          <input
            id="access-token-label"
            name="access-token-label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="e.g. CI integration"
            autoComplete="off"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <Body size="xs" variant="muted">
            Labels help identify the owner of each token. They are visible to
            all admins.
          </Body>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Permissions
          </legend>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={hasAdministratorPermission}
              onChange={handlePermissionChange(
                AccessTokenPermissions.Administrator,
              )}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
            />
            {
              ACCESS_TOKEN_PERMISSION_LABELS[
                AccessTokenPermissions.Administrator
              ]
            }
          </label>
          <Body size="xs" variant="muted">
            Administrator tokens can access and manage all resources.
          </Body>
        </fieldset>

        <Button type="submit" disabled={isCreating}>
          {isCreating ? "Creating…" : "Create access token"}
        </Button>

        {creationError && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {creationError}
          </p>
        )}

        {latestToken && (
          <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-500/60 dark:bg-blue-900/30 dark:text-blue-100">
            <p className="font-medium">
              {`Token created for ${latestToken.label}. Store it securely — it will not be shown again.`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <code className="overflow-x-auto rounded bg-slate-900 px-3 py-2 text-xs text-slate-100 dark:bg-slate-950">
                {latestToken.token}
              </code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCopyToken}
              >
                {copyButtonLabel}
              </Button>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-200">
              {`Last four digits: ${latestToken.lastFour}`}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-200">
              {`Permissions: ${formatPermissions(latestToken.permissions)}`}
            </p>
          </div>
        )}
      </Panel>

      {deletionError && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {deletionError}
        </p>
      )}

      {hasTokens ? (
        <ul className="flex flex-col gap-4">
          {tokens.map((token) => {
            const isDeleting = deleting.has(token.id);
            return (
              <Panel as="li" key={token.id}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      {token.label}
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {`Last four: ${token.lastFour}`}
                    </p>
                    <Body size="xs" variant="muted">
                      {`Created by ${token.createdBy} on ${formatTimestamp(token.createdAt)}`}
                    </Body>
                    <Body size="xs" variant="muted">
                      {`Last used: ${formatTimestamp(token.lastUsedAt)}`}
                    </Body>
                    <Body size="xs" variant="muted">
                      {`Permissions: ${formatPermissions(token.permissions)}`}
                    </Body>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleDeleteToken(token.id)}
                    disabled={isDeleting}
                    variant="danger"
                    size="sm"
                  >
                    {isDeleting ? "Removing…" : "Delete token"}
                  </Button>
                </div>
              </Panel>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-slate-600 dark:text-slate-300 sm:text-base">
          No access tokens issued yet. Create one to enable programmatic access.
        </p>
      )}
    </div>
  );
};
