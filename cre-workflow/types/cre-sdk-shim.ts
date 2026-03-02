export {}

declare module '@chainlink/cre-sdk' {
  export const bytesToHex: any
  export const ConsensusAggregationByFields: any
  export type CronPayload = any
  export const cre: any
  export const encodeCallMsg: any
  export const getNetwork: any
  export const hexToBase64: any
  export const LAST_FINALIZED_BLOCK_NUMBER: any
  export const median: any
  export class Runner {
    static newRunner<T = any>(args: any): Promise<Runner>
    run(initWorkflow: any): Promise<void>
  }
  export type Runtime<T = any> = any
  export const TxStatus: any
  export const ok: any
  export function consensusIdenticalAggregation<T = any>(): any
  export type HTTPSendRequester = any
}
