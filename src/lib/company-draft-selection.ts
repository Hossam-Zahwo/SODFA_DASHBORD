/** Business invariants for CRM channel draft creation. No network or database writes. */
export type CrmBrand = "homey" | "sodfa";
export type CrmChannel = "homey_web" | "sodfa_web";

export function channelBrand(channel: CrmChannel): CrmBrand {
  return channel === "homey_web" ? "homey" : "sodfa";
}

export function selectedDraftChannels(channels: readonly CrmChannel[]): CrmChannel[] {
  return [...new Set(channels)];
}

export function requiresCrossBrandApproval(
  sourceBrand: CrmBrand,
  channels: readonly CrmChannel[],
): boolean {
  return selectedDraftChannels(channels).some((channel) => channelBrand(channel) !== sourceBrand);
}
