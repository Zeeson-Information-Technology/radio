/**
 * Environment-aware console logging utility
 * Provides different logging levels for local development vs production
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ConsoleConfig {
  level: LogLevel;
  isDevelopment: boolean;
  enableColors: boolean;
}

class EnvironmentConsole {
  private config: ConsoleConfig;

  constructor() {
    this.config = {
      level: (process.env.LOG_LEVEL as LogLevel) || 'info',
      isDevelopment: process.env.NODE_ENV === 'development',
      enableColors: process.env.NODE_ENV === 'development'
    };
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };

    return levels[level] >= levels[this.config.level];
  }

  private formatMessage(level: LogLevel, component: string, message: string): string {
    const timestamp = new Date().toISOString();
    const prefix = this.config.isDevelopment ? 
      `[${timestamp}] ${level.toUpperCase()} [${component}]` :
      `${level.toUpperCase()} [${component}]`;
    
    return `${prefix} ${message}`;
  }

  private getColorCode(level: LogLevel): string {
    if (!this.config.enableColors) return '';
    
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m',  // Green
      warn: '\x1b[33m',  // Yellow
      error: '\x1b[31m'  // Red
    };
    
    return colors[level];
  }

  private resetColor(): string {
    return this.config.enableColors ? '\x1b[0m' : '';
  }

  /**
   * Debug logging - only in development with debug level
   */
  debug(component: string, message: string, data?: any): void {
    if (!this.shouldLog('debug')) return;
    
    const colorCode = this.getColorCode('debug');
    const resetCode = this.resetColor();
    const formattedMessage = this.formatMessage('debug', component, message);
    
    console.log(`${colorCode}${formattedMessage}${resetCode}`);
    
    if (data && this.config.isDevelopment) {
      console.log(`${colorCode}Data:${resetCode}`, data);
    }
  }

  /**
   * Info logging - standard operational messages
   */
  info(component: string, message: string, data?: any): void {
    if (!this.shouldLog('info')) return;
    
    const colorCode = this.getColorCode('info');
    const resetCode = this.resetColor();
    const formattedMessage = this.formatMessage('info', component, message);
    
    console.log(`${colorCode}${formattedMessage}${resetCode}`);
    
    if (data && this.config.isDevelopment) {
      console.log(`${colorCode}Data:${resetCode}`, data);
    }
  }

  /**
   * Warning logging - potential issues
   */
  warn(component: string, message: string, data?: any): void {
    if (!this.shouldLog('warn')) return;
    
    const colorCode = this.getColorCode('warn');
    const resetCode = this.resetColor();
    const formattedMessage = this.formatMessage('warn', component, message);
    
    console.warn(`${colorCode}${formattedMessage}${resetCode}`);
    
    if (data) {
      console.warn(`${colorCode}Data:${resetCode}`, data);
    }
  }

  /**
   * Error logging - critical issues
   */
  error(component: string, message: string, error?: any): void {
    if (!this.shouldLog('error')) return;
    
    const colorCode = this.getColorCode('error');
    const resetCode = this.resetColor();
    const formattedMessage = this.formatMessage('error', component, message);
    
    console.error(`${colorCode}${formattedMessage}${resetCode}`);
    
    if (error) {
      if (this.config.isDevelopment && error.stack) {
        console.error(`${colorCode}Stack:${resetCode}`, error.stack);
      } else {
        console.error(`${colorCode}Error:${resetCode}`, error.message || error);
      }
    }
  }

  /**
   * Audio injection specific logging
   */
  audioInjection = {
    debug: (message: string, data?: any) => this.debug('AudioInjection', message, data),
    info: (message: string, data?: any) => this.info('AudioInjection', message, data),
    warn: (message: string, data?: any) => this.warn('AudioInjection', message, data),
    error: (message: string, error?: any) => this.error('AudioInjection', message, error)
  };

  /**
   * Broadcast specific logging
   */
  broadcast = {
    debug: (message: string, data?: any) => this.debug('Broadcast', message, data),
    info: (message: string, data?: any) => this.info('Broadcast', message, data),
    warn: (message: string, data?: any) => this.warn('Broadcast', message, data),
    error: (message: string, error?: any) => this.error('Broadcast', message, error)
  };

  /**
   * WebSocket specific logging
   */
  websocket = {
    debug: (message: string, data?: any) => this.debug('WebSocket', message, data),
    info: (message: string, data?: any) => this.info('WebSocket', message, data),
    warn: (message: string, data?: any) => this.warn('WebSocket', message, data),
    error: (message: string, error?: any) => this.error('WebSocket', message, error)
  };

  /**
   * Get current configuration
   */
  getConfig(): ConsoleConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const envConsole = new EnvironmentConsole();

// Export for direct usage
export default envConsole;