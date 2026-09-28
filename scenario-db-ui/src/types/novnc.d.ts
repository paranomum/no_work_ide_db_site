declare module '@novnc/novnc/core/rfb.js' {
   export default class RFB {
      constructor(target: HTMLElement, url: string);

      viewOnly: boolean;
      scaleViewport: boolean;

      addEventListener(
         type: 'connect' | 'disconnect' | 'securityfailure' | 'credentialsrequired',
         listener: (event: Event) => void,
      ): void;

      removeEventListener(
         type: 'connect' | 'disconnect' | 'securityfailure' | 'credentialsrequired',
         listener: (event: Event) => void,
      ): void;

      sendCredentials(credentials: { password: string }): void;
      disconnect(): void;
   }
}
