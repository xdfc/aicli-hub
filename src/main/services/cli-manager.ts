import {
  BaseCLIDriver,
  CLIInfo,
  ClaudeDriver,
  QwenDriver,
  OllamaDriver,
  CustomDriver,
} from '../drivers'

export class CLIManager {
  private drivers: Map<string, BaseCLIDriver> = new Map()
  private cliInfoCache: Map<string, CLIInfo> = new Map()

  constructor() {
    this.registerDefaultDrivers()
  }

  private registerDefaultDrivers(): void {
    this.registerDriver(new ClaudeDriver())
    this.registerDriver(new QwenDriver())
    this.registerDriver(new OllamaDriver())
  }

  registerDriver(driver: BaseCLIDriver): void {
    const name = driver.getName();
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Driver name must be a non-empty string');
    }
    this.drivers.set(name, driver);
  }
  
  registerCustomDriver(
    name: string,
    displayName: string,
    command: string,
    description?: string
  ): void {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Custom driver name must be a non-empty string');
    }
    const driver = new CustomDriver(name, displayName, command, description);
    this.drivers.set(name, driver);
  }

  unregisterDriver(name: string): boolean {
    return this.drivers.delete(name)
  }

  getDriver(name: string): BaseCLIDriver | undefined {
    return this.drivers.get(name)
  }

  getAllDrivers(): BaseCLIDriver[] {
    return Array.from(this.drivers.values())
  }

  async detectAllCLIs(): Promise<CLIInfo[]> {
    const results: CLIInfo[] = []

    for (const driver of this.drivers.values()) {
      try {
        const info = await driver.detect()
        this.cliInfoCache.set(driver.getName(), info)
        results.push(info)
      } catch (error) {
        console.error(`Failed to detect CLI ${driver.getName()}:`, error)
        const info: CLIInfo = {
          name: driver.getName(),
          displayName: driver.getDisplayName(),
          command: driver.getCommand(),
          version: null,
          available: false,
          description: driver.getDescription(),
        }
        this.cliInfoCache.set(driver.getName(), info)
        results.push(info)
      }
    }

    return results
  }

  async detectCLI(name: string): Promise<CLIInfo | null> {
    const driver = this.drivers.get(name)
    if (!driver) return null

    try {
      const info = await driver.detect()
      this.cliInfoCache.set(name, info)
      return info
    } catch (error) {
      console.error(`Failed to detect CLI ${name}:`, error)
      return null
    }
  }

  getCachedCLIInfo(name: string): CLIInfo | undefined {
    return this.cliInfoCache.get(name)
  }

  getAllCachedCLIInfo(): CLIInfo[] {
    return Array.from(this.cliInfoCache.values())
  }

  getAvailableCLIs(): CLIInfo[] {
    return this.getAllCachedCLIInfo().filter((info) => info.available)
  }

  updateDriverConfig(name: string, config: Record<string, unknown>): boolean {
    const driver = this.drivers.get(name)
    if (!driver) return false

    driver.setConfig(config)

    // Update cached info
    const cachedInfo = this.cliInfoCache.get(name)
    if (cachedInfo) {
      cachedInfo.config = driver.getConfig()
    }

    return true
  }

  getDriverConfig(name: string): Record<string, unknown> | null {
    const driver = this.drivers.get(name)
    return driver ? driver.getConfig() : null
  }
}
