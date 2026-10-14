<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    */

    'llm' => [
        // Tried top to bottom. Providers with no key or model set are skipped.
        'providers' => array_values(array_filter([
            [
                'name'     => 'gemini-a',
                'base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
                'key'      => env('GEMINI_API_KEY'),
                'model'    => env('GEMINI_MODEL', 'gemini-3.8-flash'),
            ],
            [
                'name'     => 'gemini-b',
                'base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
                'key'      => env('GEMINI_API_KEY'),
                'model'    => 'gemini-3.5-flash',
            ],
            [
                'name'     => 'gemini-c',
                'base_url' => 'https://generativelanguage.googleapis.com/v1beta/openai',
                'key'      => env('GEMINI_API_KEY'),
                'model'    => 'gemini-3.1-flash-lite',
            ],
            [
                'name'     => 'groq',
                'base_url' => 'https://api.groq.com/openai/v1',
                'key'      => env('GROQ_API_KEY'),
                'model'    => env('GROQ_MODEL'),
            ],
            [
                'name'     => 'openrouter',
                'base_url' => 'https://openrouter.ai/api/v1',
                'key'      => env('OPENROUTER_API_KEY'),
                'model'    => env('OPENROUTER_MODEL'),
            ],

        ], fn ($p) => ! empty($p['key']) && ! empty($p['model']))),
    ],

    'tavily' => [
        'key' => env('TAVILY_API_KEY'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];