import { readFile, writeFile, access, constants } from 'fs/promises'
import { join } from 'path'

/**
 * Reads a .env file and parses its content into a key-value object.
 * @param filePath The full path to the .env file.
 * @returns A Promise that resolves to a Record<string, string> of environment variables.
 */
export async function readEnvFile(filePath: string): Promise<Record<string, string>> {
  try {
    await access(filePath, constants.F_OK); // Check if file exists
    const content = await readFile(filePath, 'utf-8');
    const env: Record<string, string> = {};
    content.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        const value = valueParts.join('=');
        if (key) {
          // Remove quotes from value if present
          env[key.trim()] = value.trim().replace(/^"|"$/g, '');
        }
      }
    });
    return env;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`Env file not found at ${filePath}. Returning empty object.`);
      return {};
    }
    console.error(`Error reading env file ${filePath}:`, error);
    throw new Error(`Failed to read env file: ${error.message}`);
  }
}

/**
 * Updates specific keys in a .env file. If a key does not exist, it will be added.
 * @param filePath The full path to the .env file.
 * @param updates A Record<string, string | { value: string, addQuotes?: boolean }> of keys and their new values.
 * @returns A Promise that resolves when the file is updated.
 */
export async function updateEnvFile(filePath: string, updates: Record<string, string | { value: string, addQuotes?: boolean }>): Promise<void> {
  let lines: string[] = [];
  let existingEnv: Record<string, string> = {};

  try {
    const content = await readFile(filePath, 'utf-8');
    lines = content.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key) {
          existingEnv[key.trim()] = valueParts.join('=');
        }
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn(`Env file not found at ${filePath}. Creating new file.`);
      // File doesn't exist, lines array remains empty
    } else {
      console.error(`Error reading env file for update ${filePath}:`, error);
      throw new Error(`Failed to read env file for update: ${error.message}`);
    }
  }

  const newLines: string[] = [];
  const updatedKeys = new Set<string>();

  // Helper function to format the value based on type
  const formatValue = (key: string, update: string | { value: string, addQuotes?: boolean }): string => {
    if (typeof update === 'string') {
      // For filter configurations (JSON), don't add quotes
      if (key.includes('_FILTER') && (update.startsWith('{') || update.startsWith('['))) {
        return update;
      }
      // For other values, add quotes
      return `"${update}"`;
    } else {
      // Use the addQuotes flag to determine whether to add quotes
      return update.addQuotes !== false ? `"${update.value}"` : update.value;
    }
  };

  // Iterate over existing lines, updating if a key matches
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key] = trimmedLine.split('=');
      const trimmedKey = key.trim();
      if (updates.hasOwnProperty(trimmedKey)) {
        // Update existing key
        const formattedValue = formatValue(trimmedKey, updates[trimmedKey]);
        newLines.push(`${trimmedKey}=${formattedValue}`);
        updatedKeys.add(trimmedKey);
      } else {
        // Keep original line
        newLines.push(line);
      }
    } else {
      // Keep comments and empty lines
      newLines.push(line);
    }
  }

  // Add new keys that were not present
  for (const key in updates) {
    if (!updatedKeys.has(key)) {
      const formattedValue = formatValue(key, updates[key]);
      newLines.push(`${key}=${formattedValue}`);
    }
  }

  // Ensure there's a newline at the end if the file is not empty
  if (newLines.length > 0 && newLines[newLines.length - 1] !== '') {
    newLines.push('');
  }

  await writeFile(filePath, newLines.join('\n'), 'utf-8');
}
