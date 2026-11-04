import { Plugin } from "vite";
import { EnvConfig } from "virtual:env-config";

const virtualModuleId = "virtual:env-config";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;

export function envConfig(options: {
  isDevelopment: boolean;
  clientVersion: string;
}): Plugin {
  return {
    name: "virtual-env-config",
    resolveId(id) {
      if (id === virtualModuleId) return resolvedVirtualModuleId;
      return undefined;
    },
    load(id) {
      if (id === resolvedVirtualModuleId) {
        const devConfig: EnvConfig = {
          isDevelopment: true,
          clientVersion: options.clientVersion,
        };

        const prodConfig: EnvConfig = {
          isDevelopment: false,
          clientVersion: options.clientVersion,
        };

        const envConfig = options.isDevelopment ? devConfig : prodConfig;
        return `
          export const envConfig = ${JSON.stringify(envConfig)};
        `;
      }
      return undefined;
    },
  };
}
