import { SSEPromise } from "../base/PartPromise";
import { Xhs } from "./xhs";

export interface PlatformConfig{

}

export interface Source {
  id: string;
  title: string;
  url: string;
  snippet?: string;
  images?: string[];
}

export interface PlatformMetadata {
  name: string;
  code: string;
  icon: string;
}

export interface Platform<T extends PlatformConfig> {
  readonly metadata: PlatformMetadata;

  start(config: T): Promise<void>;
  stop(): Promise<void>;

  search(q: string, sse: SSEPromise<Source[]>): Promise<Source[]>;
}

export class PlatformRegister {
  private readonly platformConfigs: Record<string, PlatformConfig>;
  private platforms: Record<string, Platform<PlatformConfig>> = {};
  private initializationPromises: Record<string, Promise<void>>;

  constructor() {
    this.platforms = {
      xhs: new Xhs()
    };
    
    this.platformConfigs = {}
    this.initializationPromises = {};
  }

  async getPlatform<T extends PlatformConfig>(code: string): Promise<Platform<T>> {
    const platform: Platform<T> = this.platforms[code] as Platform<T>;
    if(!this.initializationPromises[code]){
      this.initializationPromises[code] = platform.start(this.platformConfigs[code] as T);
    }
    await this.initializationPromises[code];
    return platform;
  }

  getPlatforms(): PlatformMetadata[] {
    return Object.values(this.platforms).map(platform => platform.metadata);
  }
}