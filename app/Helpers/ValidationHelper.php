<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Cache;

class ValidationHelper
{
    /**
     * Parse validation.ts to extract regex patterns.
     */
    public static function pattern(string $key): string
    {
        $patterns = Cache::rememberForever('validation_patterns', function () {
            $path = base_path('resources/js/lib/validation.ts');
            if (!file_exists($path)) {
                return [];
            }
            $content = file_get_contents($path);
            
            $patterns = [];
            // Match the PATTERNS object contents
            if (preg_match('/export const PATTERNS = \{(.*?)\};/s', $content, $matches)) {
                $lines = explode("\n", trim($matches[1]));
                foreach ($lines as $line) {
                    if (preg_match('/([a-zA-Z0-9_]+):\s*\/(.*?)\//', $line, $lineMatches)) {
                        $patterns[$lineMatches[1]] = '/' . $lineMatches[2] . '/';
                    }
                }
            }
            return $patterns;
        });

        return $patterns[$key] ?? '/.*/';
    }

    /**
     * Parse validation.ts to extract error messages.
     */
    public static function message(string $key): string
    {
        $messages = Cache::rememberForever('validation_messages', function () {
            $path = base_path('resources/js/lib/validation.ts');
            if (!file_exists($path)) {
                return [];
            }
            $content = file_get_contents($path);
            
            $messages = [];
            // Match the MESSAGES object contents
            if (preg_match('/export const MESSAGES = \{(.*?)\};/s', $content, $matches)) {
                $lines = explode("\n", trim($matches[1]));
                foreach ($lines as $line) {
                    if (preg_match('/([a-zA-Z0-9_]+):\s*"(.*?)"/', $line, $lineMatches)) {
                        $messages[$lineMatches[1]] = $lineMatches[2];
                    }
                }
            }
            return $messages;
        });

        return $messages[$key] ?? 'Invalid format.';
    }
}
