<?php

namespace App\Http\Controllers;

use App\Models\Delivery;
use App\Models\Attachment;
use App\Models\ServePo;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ChatbotController extends Controller
{
    // Step 1 does the work. Steps 2-3 only run if a tool errors and the model must retry.
    private const MAX_STEPS = 3;
    private const OPS = ['=', '!=', 'like', '>', '<', '>=', '<='];

    // Tools whose results PHP formats itself (no second AI call).
    private const DIRECT_TOOLS = [
        'search_records', 'count_records', 'get_overview', 'find_purchase_order', 'list_deliveries',
        'aggregate_records', 'list_records_with_attachments',
    ];

    // Messages matching this want an analysis written by the model, not a raw record list.
    private const ANALYSIS_PATTERN = '/\b(summari[sz]e|summary|analy[sz]e|analysis|insights?|trends?|breakdown|break down|highlights|report on|compare|comparison|performance|statistics|stats)\b/i';

    // Messages that look like they are about the system's own data (or follow up on a list from it).
    // Only these are forced to use a tool; everything else is a general question the model may answer directly.
    // If a module is not recognised, add its name here.
    private const DATA_PATTERN = '/\b(deliver\w*|purchase orders?|pos?|po-?\d\S*|stock\w*|items?|inspect\w*|issuance\w*|suppliers?|offices?|records?|attachments?|rrsp|rrppe|regspi|itr|ptr|disposal|bona|wmr|pir|iar|ics|clearance|fund|transactions?|overdue|pending|these|those|them)\b/i';

    // ---- Record formatting (render) ----
    // First of these that exists in a row becomes the bold title of its bullet.
    private const TITLE_KEYS = [
        'po_number', 'delivery_no', 'wmr_no', 'iar_no', 'pir_no', 'ics_no', 'par_no', 'stock_no',
        'item_name', 'item_description', 'description', 'office_name', 'supplier_name', 'name',
        'reference', 'title',
    ];
    // Never shown in record bullets.
    private const HIDDEN_FIELDS = ['created_at', 'updated_at', 'deleted_at'];
    // Columns matching this are shown first when a record has to be shortened.
    private const IMPORTANT_FIELDS = '/status|date|office|supplier|qty|quantity|amount|total|price|item|description|name/i';
    // Fields per record when many results are listed / when exactly one record matches.
    private const MAX_DETAIL_FIELDS = 6;
    private const MAX_DETAIL_FIELDS_SINGLE = 20;

    // Extra hints so the model picks the right columns. Only used if the table exists.
    private const TABLE_NOTES = [
        'bona_vida_monitoring' => 'qty = number of bands received, price = price per band, total_amount = qty x price (the spend). '
            . 'office_code is an office code, so for per-office questions use group_by office_code (office names are added for you). '
            . 'Dates: date_received and invoice_date.',
    ];

    /** Known record pages and their stable row identifiers. */
    private const RECORD_PAGES = [
        'serve_po' => ['route' => 'purchase-orders.index', 'key' => 'po_number'],
        'serve_po_items' => ['route' => 'purchase-orders.index', 'key' => 'po_number'],
        'stock_items' => ['route' => 'stock-items.index', 'key' => 'stock_no'],
        'stock_item_unit' => ['route' => 'stock-items.index', 'key' => 'stock_no'],
        'transactions' => ['route' => 'transaction-logs.index', 'key' => 'transactionID'],
        'delivery' => ['route' => 'deliveries.index', 'key' => 'delivery_id'],
        'delivery_follow_ups' => ['route' => 'delivery-follow-ups.index', 'key' => 'id'],
        'clearance' => ['route' => 'clearance.index', 'key' => 'clearance_id'],
        'offices' => ['route' => 'offices.index', 'key' => 'office_code'],
        'fund_clusters' => ['route' => 'fund-clusters.index', 'key' => 'fund_cluster_id'],
        'areas' => ['route' => 'rrsp-monitoring.areas.index', 'key' => 'areaID'],
        'rrppe_areas' => ['route' => 'rrppe-monitoring.areas.index', 'key' => 'id'],
        'rrsp_items' => ['route' => 'rrsp-monitoring.index', 'key' => 'rrsp_monitoring_id'],
        'rrsp_monitoring' => ['route' => 'rrsp-monitoring.index', 'key' => 'id'],
        'rrppe_items' => ['route' => 'rrppe-monitoring.index', 'key' => 'rrppe_monitoring_id'],
        'rrppe_monitoring' => ['route' => 'rrppe-monitoring.index', 'key' => 'id'],
        'regspi_monitoring' => ['route' => 'regspi-monitoring.index', 'key' => 'regspi_id'],
        'itr_ptr_monitoring' => ['route' => 'itr-ptr-monitoring.index', 'key' => 'id'],
        'for_disposal_monitoring' => ['route' => 'for-disposal-monitoring.index', 'key' => 'id'],
        'bona_vida_monitoring' => ['route' => 'bona-vida-monitoring.index', 'key' => 'bvm_id'],
        'po_letter_monitoring' => ['route' => 'po-letter-monitoring.index', 'key' => 'id'],
        'wmr_monitoring' => ['route' => 'wmr-monitoring.index', 'key' => 'id'],
        'units' => ['route' => 'units.index', 'key' => 'unitID'],
        'supplier_list' => ['route' => 'supplier.index', 'key' => 'supplier_id'],
    ];

    /** Models that use the shared polymorphic attachments table. */
    private const ATTACHABLE_MODELS = [
        'serve_po' => ['model' => \App\Models\ServePo::class, 'key' => 'po_number'],
        'delivery' => ['model' => \App\Models\Delivery::class, 'key' => 'delivery_id'],
        'clearance' => ['model' => \App\Models\Clearance::class, 'key' => 'clearance_id'],
        'pir_monitoring' => ['model' => \App\Models\PirMonitoring::class, 'key' => 'pir_id'],
        'po_letter_monitoring' => ['model' => \App\Models\PoLetterMonitoring::class, 'key' => 'id'],
        'rrsp_monitoring' => ['model' => \App\Models\RrspMonitoring::class, 'key' => 'id'],
        'rrppe_monitoring' => ['model' => \App\Models\RRPPEMonitoring::class, 'key' => 'id'],
        'rrsp_items' => ['model' => \App\Models\RrspMonitoring::class, 'key' => 'rrsp_monitoring_id'],
        'rrppe_items' => ['model' => \App\Models\RRPPEMonitoring::class, 'key' => 'rrppe_monitoring_id'],
        'serve_po_items' => ['model' => \App\Models\ServePo::class, 'key' => 'po_number'],
        'po_inspection_entries' => ['model' => \App\Models\ServePo::class, 'key' => 'po_number'],
        'pir_inspection_entries' => ['model' => \App\Models\PirMonitoring::class, 'key' => 'pir_id'],
    ];

    // Tables the chatbot must never touch (admin / system stuff).
    private const DENY_EXACT = [
        'users', 'migrations', 'sessions', 'cache', 'cache_locks', 'jobs', 'attachments',
        'job_batches', 'failed_jobs', 'password_reset_tokens', 'personal_access_tokens',
    ];
    private const DENY_PATTERN = '/audit|message|notification|session|password|token|migration|backup|import|scheduled|two_factor/i';

    /** Status code of the last failed provider call (429 = rate limited). */
    private int $lastStatus = 0;

    /**
     * Every readable table, auto-discovered. table name => label.
     * To also block something (e.g. employee files), add a word to
     * DENY_PATTERN above, like |employee
     */
    private function modules(): array
    {
        return Cache::remember('chatbot_tables_v4', 600, function () {
            try {
                $names = collect(Schema::getTables())->map(
                    fn ($t) => is_array($t) ? ($t['name'] ?? '') : ($t->name ?? (string) $t)
                );
            } catch (\Throwable $e) {
                $names = collect(Schema::getTableListing());
            }

            $out = [];
            foreach ($names->map(fn ($n) => preg_replace('/^.*\./', '', (string) $n))->filter()->unique()->sort() as $t) {
                if (in_array($t, self::DENY_EXACT, true) || preg_match(self::DENY_PATTERN, $t)) {
                    continue;
                }
                $out[$t] = str_replace('_', ' ', $t);
            }

            return $out;
        });
    }

    /** Live web search is only offered when a Tavily key is configured (services.tavily.key). */
    private function webEnabled(): bool
    {
        return (string) config('services.tavily.key') !== '';
    }

    // ------------------------------------------------------------------
    // Endpoint (wrapped so crashes show a readable error)
    // ------------------------------------------------------------------
    public function send(Request $request)
    {
        try {
            return $this->handle($request);
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Chatbot crash', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'reply' => config('app.debug')
                    ? 'Server error: ' . $e->getMessage()
                    : 'Something went wrong on the server.',
            ], 500);
        }
    }

    private function handle(Request $request)
    {
        set_time_limit(150);
        $deadline = microtime(true) + 80;

        $data = $request->validate([
            'messages' => 'required|array|max:20',
            'messages.*.role' => 'required|in:user,assistant',
            'messages.*.content' => 'required|string|max:6000',
        ]);

        // Zero-call shortcut: plain "overview" / "summary" / "dashboard" needs no AI.
        $lastMsg = strtolower(trim((string) (collect($data['messages'])->last()['content'] ?? '')));
        if (preg_match('/^(give me|show me|get)?\s*(an?|the)?\s*(overview|summary|dashboard)[\s?.!]*$/', $lastMsg)) {
            return response()->json(['reply' => $this->render('get_overview', $this->getOverview())]);
        }

        // Zero-call shortcut: "any/all purchase orders with attachments" (no specific PO number given).
        if (preg_match('/attach/', $lastMsg)
            && preg_match('/\b(purchase orders?|pos?)\b/', $lastMsg)
            && ! preg_match('/\d/', $lastMsg)) {
            return response()->json(['reply' => $this->render(
                'list_records_with_attachments',
                $this->recordsWithAttachments(['module' => 'serve_po'])
            )]);
        }

        // Does this look like a question about the system's own data?
        $isDataQuestion = (bool) preg_match(self::DATA_PATTERN, $lastMsg);

        // "Summarize / analyze / trends ..." about system data -> the model must write the answer from the data.
        $analysis = $isDataQuestion && preg_match(self::ANALYSIS_PATTERN, $lastMsg);

        $messages = array_merge(
            [['role' => 'system', 'content' => $this->systemPrompt($analysis)]],
            $data['messages']
        );

        $nudged = false;
        $guarded = false;   // already forced a lookup once
        $usedTool = false;  // has the model called any tool yet

        for ($step = 0; $step < self::MAX_STEPS; $step++) {
            if (microtime(true) > $deadline) {
                break;
            }

            $isLast = $step === self::MAX_STEPS - 1;

            $payload = [
                'messages' => $messages,
                'max_tokens' => $analysis ? 1500 : 800,
            ];
            // Last step: no tools, so the model is forced to answer.
            if (! $isLast) {
                $payload['tools'] = $this->tools();
            }

            $message = $this->callModel($payload);
            if ($message === null) {
                $msg = $this->lastStatus === 429
                    ? 'The AI hit its free usage limit. Try again in a bit.'
                    : 'Assistant is unavailable right now. Try again in a moment.';

                return response()->json(['reply' => $msg], 503);
            }

            $toolCalls = $isLast ? [] : ($message['tool_calls'] ?? []);

            // Some models write the tool call as plain text. Catch and run it.
            if (! $isLast && empty($toolCalls)) {
                $toolCalls = $this->parseTextToolCalls($this->rawContent($message));
                if ($toolCalls) {
                    $message['content'] = '';
                }
            }

            // No tool requested -> final answer.
            if (empty($toolCalls)) {
                $text = $this->extractText($message);

                // A system-data question was answered without looking anything up, so the model is
                // guessing from the chat history (which only holds trimmed text). Throw that
                // answer away and force a real lookup, once. General questions skip this.
                if (! $isLast
                    && $isDataQuestion
                    && ! $usedTool
                    && ! $guarded
                    && $text !== '') {
                    $guarded = true;
                    $messages[] = [
                        'role' => 'user',
                        'content' => 'Do not answer from earlier messages, they only show partial data. '
                            . 'Call the right tool now, with filters that match my last question, then answer from its result.',
                    ];
                    continue;
                }

                if ($text !== '') {
                    return response()->json(['reply' => $text]);
                }

                Log::warning('Chatbot empty answer', ['message' => $message]);

                if (! $nudged) {
                    $nudged = true;
                    $messages[] = [
                        'role' => 'user',
                        'content' => 'Answer my last question in plain text now, using any tool results above. Do not write tool-call markup.',
                    ];
                    continue;
                }
                break;
            }

            $usedTool = true;

            $messages[] = [
                'role' => 'assistant',
                'content' => $message['content'] ?? '',
                'tool_calls' => $toolCalls,
            ];

            $replies = [];
            $hadError = false;
            $needsAi = false;

            foreach ($toolCalls as $i => $call) {
                $name = $call['function']['name'] ?? '';
                $args = json_decode($call['function']['arguments'] ?? '{}', true) ?: [];

                try {
                    $result = $this->runTool($name, $args);
                } catch (\Throwable $e) {
                    Log::error('Chatbot tool error', ['tool' => $name, 'error' => $e->getMessage()]);
                    $result = ['error' => 'Lookup failed. Try different filters.'];
                }

                Log::info('Chatbot tool', ['tool' => $name, 'args' => $args, 'error' => $result['error'] ?? null]);

                if (isset($result['error'])) {
                    $hadError = true;
                } elseif (in_array($name, self::DIRECT_TOOLS, true) && ! $analysis) {
                    $replies[] = $this->render($name, $result);
                } else {
                    // summarize_module / list_modules / describe_module / web_search, or any tool during
                    // an analysis request: the model needs to continue and write the answer.
                    $needsAi = true;
                }

                $messages[] = [
                    'role' => 'tool',
                    'tool_call_id' => $call['id'] ?? ('call_' . $step . '_' . $i),
                    'name' => $name,
                    'content' => json_encode($result),
                ];
            }

            // Success -> answer now, no second AI call.
            if (! $hadError && ! $needsAi && $replies) {
                return response()->json(['reply' => implode("\n\n", $replies)]);
            }
        }

        return response()->json([
            'reply' => "I couldn't get a clear answer for that. Try rephrasing, or mention the module name (like RegSPI or stock items).",
        ]);
    }

    // ------------------------------------------------------------------
    // Formats tool results into the final reply (no AI needed)
    // ------------------------------------------------------------------
    private function render(string $name, array $r): string
    {
        if ($name === 'get_overview') {
            return "- Pending deliveries: {$r['pending_deliveries']}\n"
                . "- Overdue deliveries: {$r['overdue_deliveries']}\n"
                . "- Pending inspections: {$r['pending_inspections']}\n"
                . "- Pending issuances: {$r['pending_issuances']}";
        }

        if ($name === 'find_purchase_order') {
            $matches = collect($r['matches'] ?? []);
            if ($matches->isEmpty()) {
                return $r['note'] ?? 'No purchase order found.';
            }

            return $matches->map(function ($purchaseOrder) {
                $lines = [
                    '- [PO ' . $purchaseOrder['po_number'] . '](' . $purchaseOrder['url'] . ')'
                        . ' — supplier: ' . ($purchaseOrder['supplier'] ?: 'Unknown')
                        . ' | status: ' . $purchaseOrder['status'],
                ];

                if (! empty($purchaseOrder['attachments'])) {
                    $lines[] = '  Attachments:';
                    foreach ($purchaseOrder['attachments'] as $attachment) {
                        $name = preg_replace('/[\r\n\[\]]+/', ' ', $attachment['name']);
                        $lines[] = '  - [Attachment: ' . trim($name) . '](' . $this->markdownUrl($attachment['url']) . ')';
                    }
                } else {
                    $lines[] = '  Attachments: none';
                }

                return implode("\n", $lines);
            })->implode("\n\n");
        }

        if ($name === 'list_records_with_attachments') {
            $items = collect($r['showing'] ?? []);
            if ($items->isEmpty()) {
                return 'No records with attachments found.';
            }

            $total = $r['total_matches'] ?? $items->count();
            $head = $total > $items->count()
                ? "{$total} records have attachments, showing {$items->count()}:"
                : "{$total} with attachments:";

            $lines = $items->map(function ($x) {
                $line = $x['_url'] ? '- [' . $x['label'] . '](' . $x['_url'] . ')' : '- ' . $x['label'];
                foreach ($x['_attachments'] as $attachment) {
                    $line .= "\n  - [Attachment: " . $attachment['name'] . '](' . $this->markdownUrl($attachment['url']) . ')';
                }

                return $line;
            })->implode("\n");

            return $head . "\n" . $lines;
        }

        if (isset($r['group_by'])) {
            $items = collect($r['showing']);
            if ($items->isEmpty()) {
                return 'No match found.';
            }

            $lines = $items->map(function ($x) {
                $v = $x['agg_value'];
                if (is_numeric($v)) {
                    $v = number_format((float) $v, floor((float) $v) == (float) $v ? 0 : 2);
                }

                $line = "- {$x['label']}: {$v}";

                return ! empty($x['url'])
                    ? $line . ' — [View record](' . $x['url'] . ')'
                    : $line;
            })->implode("\n");

            return "Ranking by {$r['metric']} ({$r['order']}):\n" . $lines;
        }

        if (isset($r['count'])) {
            return "Count: {$r['count']}";
        }

        $rows = $r['showing'] ?? $r['matches'] ?? null;
        if ($rows !== null) {
            $rows = collect($rows);
            if ($rows->isEmpty()) {
                return 'No match found.';
            }

            // One matching record -> show everything about it. Many -> keep each one short.
            $single = $rows->count() === 1;

            $lines = $rows->map(function ($row) use ($single) {
                $row = (array) $row;
                $url = $row['_url'] ?? null;
                $attachments = $row['_attachments'] ?? [];
                unset($row['_url'], $row['_attachments']);

                [$title, $details] = $this->formatRow($row, $single);

                $line = '- **' . $title . '**';
                if ($url) {
                    $line .= ' — [View record](' . $url . ')';
                }

                if ($details !== '') {
                    $line .= "\n  " . $details;
                }

                foreach ($attachments as $attachment) {
                    $line .= "\n  - [Attachment: " . $attachment['name'] . '](' . $this->markdownUrl($attachment['url']) . ')';
                }

                return $line;
            })->implode("\n\n");

            $total = $r['total_matches'] ?? $rows->count();
            $head = $total > $rows->count()
                ? "Found {$total} matches, showing {$rows->count()}:"
                : "Found {$total}:";

            return $head . "\n\n" . $lines;
        }

        return json_encode($r, JSON_PRETTY_PRINT);
    }

    /**
     * Turns one raw record into [title, "Label: value · Label: value"].
     * Picks an identifying title, drops ids/junk/empty values, shows the
     * most useful fields first and caps how many are shown.
     */
    private function formatRow(array $row, bool $showAll = false): array
    {
        $fields = [];
        foreach ($row as $k => $v) {
            $k = (string) $k;
            if ($k === 'id' || str_ends_with($k, '_id') || in_array($k, self::HIDDEN_FIELDS, true)) {
                continue;
            }

            $clean = $this->cleanValue($v);
            if ($clean !== null) {
                $fields[$k] = $clean;
            }
        }

        $titleKey = null;
        foreach (self::TITLE_KEYS as $k) {
            if (isset($fields[$k])) {
                $titleKey = $k;
                break;
            }
        }
        if ($titleKey === null) {
            $titleKey = array_key_first($fields);
        }

        $title = 'Record';
        if ($titleKey !== null) {
            $title = $fields[$titleKey];
            unset($fields[$titleKey]);
        }

        // Most useful fields first, then the rest in column order.
        $important = [];
        $rest = [];
        foreach ($fields as $k => $v) {
            if (preg_match(self::IMPORTANT_FIELDS, $k)) {
                $important[$k] = $v;
            } else {
                $rest[$k] = $v;
            }
        }
        $ordered = $important + $rest;

        $max = $showAll ? self::MAX_DETAIL_FIELDS_SINGLE : self::MAX_DETAIL_FIELDS;
        $shown = array_slice($ordered, 0, $max, true);
        $hidden = count($ordered) - count($shown);

        $parts = [];
        foreach ($shown as $k => $v) {
            $parts[] = ucfirst(str_replace('_', ' ', $k)) . ': ' . $v;
        }
        if ($hidden > 0) {
            $parts[] = "+{$hidden} more";
        }

        return [$title, implode(' · ', $parts)];
    }

    /** Cleans one value for display. Returns null for empty / junk values. */
    private function cleanValue($v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }

        $s = is_scalar($v) ? (string) $v : json_encode($v);
        $s = trim(preg_replace('/\s+/', ' ', $s));
        // Strip characters that would break the chat's markdown rendering.
        $s = trim(str_replace(['[', ']', '*'], '', $s));

        // Empty-ish or junk values (e.g. "########" from Excel imports, "-", "N/A").
        if ($s === '' || preg_match('/^[#\-_.*\s]+$/', $s) || preg_match('/^(n\/?a|null|none)$/i', $s)) {
            return null;
        }

        // Dates -> "Jan 24, 2023".
        if (preg_match('/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?Z?)?$/', $s)) {
            if (str_starts_with($s, '0000')) {
                return null;
            }
            try {
                $s = Carbon::parse($s)->format('M j, Y');
            } catch (\Throwable $e) {
                // keep the original text
            }
        }

        if (mb_strlen($s) > 70) {
            $s = rtrim(mb_substr($s, 0, 67)) . '…';
        }

        return $s;
    }

    // ------------------------------------------------------------------
    // Provider / key rotation
    // ------------------------------------------------------------------

    /** Flattens config providers; comma-separated keys become separate entries. */
    private function providers(): array
    {
        $out = [];

        foreach ((array) config('services.llm.providers', []) as $p) {
            $keys = array_values(array_filter(array_map('trim', explode(',', (string) ($p['key'] ?? '')))));

            foreach ($keys as $i => $key) {
                $out[] = [
                    'id' => $p['name'] . '#' . ($i + 1),
                    'base_url' => rtrim($p['base_url'], '/'),
                    'key' => $key,
                    'model' => $p['model'],
                ];
            }
        }

        return $out;
    }

    /**
     * Tries each provider in order. A provider that fails is put on a
     * cooldown (60s per-minute limit, 1h daily limit, 10min bad key/model)
     * and the next one is tried.
     */
    private function callModel(array $payload): ?array
    {
        foreach ($this->providers() as $p) {
            $coolKey = 'chatbot_cool:' . $p['id'];

            if (Cache::has($coolKey)) {
                $this->lastStatus = (int) Cache::get($coolKey);
                continue;
            }

            $payload['model'] = $p['model'];

            try {
                $response = Http::withToken($p['key'])
                    ->timeout(35)
                    ->post($p['base_url'] . '/chat/completions', $payload);
            } catch (\Throwable $e) {
                Log::error('Chatbot API exception', ['provider' => $p['id'], 'error' => $e->getMessage()]);
                $this->lastStatus = 599;
                Cache::put($coolKey, 599, 30);
                continue;
            }

            if ($response->successful() && ! $response->json('error')) {
                $msg = $response->json('choices.0.message');
                if (is_array($msg)) {
                    return $msg;
                }
            }

            $status = $response->status();
            $body = $response->body();
            $this->lastStatus = $status;

            Log::error('Chatbot API error', [
                'provider' => $p['id'],
                'model' => $p['model'],
                'status' => $status,
                'body' => mb_substr($body, 0, 500),
            ]);

            $cool = match (true) {
                $status === 429 => preg_match('/day|daily/i', $body) ? 3600 : 60,
                in_array($status, [401, 402, 403, 404], true) => 600,
                default => 30,
            };

            Cache::put($coolKey, $status, $cool);
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Text helpers
    // ------------------------------------------------------------------
    private function rawContent(array $message): string
    {
        $c = $message['content'] ?? '';

        if (is_array($c)) {
            $c = collect($c)
                ->map(fn ($p) => is_array($p) ? ($p['text'] ?? '') : (string) $p)
                ->implode('');
        }

        return (string) $c;
    }

    private function extractText(array $message): string
    {
        $c = $this->rawContent($message);

        // Strip reasoning blocks and any leaked tool-call markup.
        $c = preg_replace('/<think>.*?<\/think>/s', '', $c);
        $c = preg_replace('/<tool_call>.*?(<\/tool_call>|$)/s', '', $c);
        $c = preg_replace('/<function=.*?<\/function>/s', '', $c);

        return trim($c);
    }

    /**
     * Parses tool calls that a model wrote as text, in either style:
     *   <function=name><parameter=key>value</parameter></function>
     *   <tool_call>{"name": "...", "arguments": {...}}</tool_call>
     */
    private function parseTextToolCalls(string $text): array
    {
        $calls = [];

        if (preg_match_all('/<function=([\w\-]+)>(.*?)<\/function>/s', $text, $fns, PREG_SET_ORDER)) {
            foreach ($fns as $i => $fn) {
                $args = [];
                preg_match_all('/<parameter=([\w\-]+)>\s*(.*?)\s*<\/parameter>/s', $fn[2], $ps, PREG_SET_ORDER);

                foreach ($ps as $p) {
                    $v = trim($p[2]);
                    $decoded = json_decode($v, true);
                    $args[$p[1]] = (json_last_error() === JSON_ERROR_NONE
                        && (is_array($decoded) || is_bool($decoded) || is_numeric($decoded)))
                        ? $decoded
                        : $v;
                }

                $calls[] = [
                    'id' => 'text_' . $i,
                    'type' => 'function',
                    'function' => ['name' => $fn[1], 'arguments' => json_encode($args ?: new \stdClass())],
                ];
            }
        }

        if (! $calls && preg_match_all('/<tool_call>\s*(\{.*?\})\s*<\/tool_call>/s', $text, $js, PREG_SET_ORDER)) {
            foreach ($js as $i => $j) {
                $obj = json_decode($j[1], true);
                if (is_array($obj) && ! empty($obj['name'])) {
                    $calls[] = [
                        'id' => 'text_' . $i,
                        'type' => 'function',
                        'function' => [
                            'name' => $obj['name'],
                            'arguments' => json_encode($obj['arguments'] ?? new \stdClass()),
                        ],
                    ];
                }
            }
        }

        return $calls;
    }

    private function systemPrompt(bool $analysis = false): string
    {
        $schema = Cache::remember('chatbot_schema_v2', 600, function () {
            $lines = [];
            foreach (array_keys($this->modules()) as $key) {
                $r = $this->resolve($key);
                if ($r) {
                    $lines[] = "- {$key}: " . implode(', ', $r[1]);
                }
            }
            return implode("\n", $lines);
        });

        $liveRule = $this->webEnabled()
            ? "- For live or recent info (news, weather, prices, scores, recent events, anything newer than your knowledge), call web_search, then answer from its results. Name the source sites in plain text (like 'according to bbc.com'). Do NOT write markdown links to outside sites.\n"
            : "- You have no internet access. For live info (news, weather, prices, scores, recent events) say you cannot check it live, and only share what you know, noting it may be outdated.\n";

        $prompt = "You are the assistant for our Supply Management Information System (SMIS). "
            . "Today is " . now()->format('F j, Y') . ".\n\n"
            . "RULES:\n"
            . "- For ANY question about the system's own data (deliveries, purchase orders, stock, offices, records...), use the tools. Never guess or invent records, numbers, names or dates.\n"
            . "- For general questions unrelated to the system data (facts, explanations, how-tos, writing, coding, math, translations, advice), answer directly from your own knowledge. Do not call the data tools for them. Keep answers short and clear.\n"
            . $liveRule
            . "- FOLLOW-UPS: when the user says 'these', 'those', 'of them' or narrows an earlier list (by month, status, supplier, office...), call a tool again with filters for that. Earlier messages only show trimmed records, so NEVER answer a follow-up from them.\n"
            . "- Modules are database tables, listed below with their columns. Pick the module that matches the topic the user names (for example 'regspi' for RegSPI, 'rrppe' for RRPPE, 'stock_items' for stock). Go straight to search_records or count_records.\n"
            . "- When the user gives an ID or code (like ICS-01-RAF-2007050006), search the module matching the topic they mentioned, using the FULL code as the search text.\n"
            . "- For 'low stock' questions: if the stock table has both a quantity/balance column and a reorder/minimum level column, use a filter with compare_column (for example column=quantity, op='<=', compare_column=reorder level). Otherwise sort ascending by the quantity/balance column.\n"
            . "- Some columns are ids (like supplier_id). Do not show raw ids as if they were names. For names use list_deliveries or find_purchase_order, which include supplier names.\n"
            . "- For deliveries due in a month or date range, use list_deliveries with due_from and due_to (YYYY-MM-DD), plus status if the user mentioned one.\n"
            . "- For a specific purchase order (needs a PO number) or its attachments, use find_purchase_order. Include its PO and attachment links in your answer.\n"
            . "- For 'which / any / all purchase orders (or records) have attachments', use list_records_with_attachments. Never say none exist without calling it.\n"
            . "- When you return records from search_records or list_deliveries, include their provided View record links and show any provided attachments. For highest/lowest rankings, include the provided link for each result.\n"
            . "- If asked to show or send attachments for a non-PO record, use search_records for that module and include every provided Attachment link.\n"
            . "- For 'which X has the highest/most/lowest' or totals per group (per office, supplier, month), use aggregate_records. NEVER work out a ranking yourself from search_records rows.\n"
            . "- ANALYSIS REQUESTS about system data (summarize, analyze, insights, trends, breakdown, 'what is going on with ...'): call summarize_module, NOT search_records, and write a real analysis in your own words. Never just list records for these.\n"
            . "- For summarize_module: date_column = the main transaction date of that module (for purchase orders, the PO date column). amount_columns = the main money columns (for procurement, the total amount / ABC column). group_by_columns = the 1-3 columns most useful for breaking the data down (status, office, supplier, category, and so on).\n"
            . "- A month without a year means that month in the current year, or the most recent one if it has not happened yet. Convert it to date_from (first day) and date_to (last day). 'This month', 'last month', 'this year' and quarters work the same way.\n"
            . "- Write analyses in short labelled sections: a **bold** label on its own line, then text or '-' bullets. No # headings and no tables. Sections: **Overview** (2-3 sentences: how many records, total value, the period), **Key figures**, **Breakdown** (top groups with their share), **Trend** (monthly pattern or change vs the previous period, only if provided), **Notable records** (the largest ones, each with its View record link), **Observations** (2-4 takeaways such as concentration, outliers or missing data). Aim for roughly 200-300 words.\n"
            . "- In analyses use ONLY numbers from the tool result, and use the provided share and change percentages instead of calculating your own. Write amounts in pesos like ₱1,234,567.89. If the period has no records, say so and suggest a nearby period.\n"
            . "- Dates: to match one day use op '=' with YYYY-MM-DD (it also matches timestamps). Use >= and <= for ranges.\n"
            . "- Deleted records are already excluded automatically.\n"
            . "- You can only read data. You cannot create, edit or delete anything.\n"
            . "- Use the proper tool-calling mechanism. Never write tool-call markup or XML in your answer.\n"
            . "- After you receive tool results, ALWAYS write a final answer. For lookups keep it short and use a short bullet list when showing several records.\n"
            . "- If nothing matches in the system data, say you found no match.\n\n"
            . "MODULES AND COLUMNS:\n{$schema}"
            . $this->tableNotes();

        if ($analysis) {
            $prompt .= "\n\nTHE USER IS ASKING FOR AN ANALYSIS. Call summarize_module (not search_records), then write the analysis in the format above.";
        }

        return $prompt;
    }

    private function tableNotes(): string
    {
        $out = [];
        foreach (self::TABLE_NOTES as $table => $note) {
            if (array_key_exists($table, $this->modules())) {
                $out[] = "- {$table}: {$note}";
            }
        }

        return $out ? "\n\nTABLE NOTES:\n" . implode("\n", $out) : '';
    }

    // ------------------------------------------------------------------
    // Tool definitions
    // ------------------------------------------------------------------
    private function tools(): array
    {
        $filterSchema = [
            'type' => 'array',
            'description' => 'Optional conditions. Column names must come from the module columns.',
            'items' => [
                'type' => 'object',
                'properties' => [
                    'column' => ['type' => 'string'],
                    'op' => ['type' => 'string', 'description' => 'One of: =, !=, like, >, <, >=, <='],
                    'value' => ['type' => 'string', 'description' => 'Value to compare with'],
                    'compare_column' => ['type' => 'string', 'description' => 'Instead of value: compare against another column of the same table'],
                ],
                'required' => ['column'],
            ],
        ];

        $tools = [
            $this->fn('list_modules', 'List all modules you can look up.', new \stdClass()),
            $this->fn('describe_module', 'Show the column names of a module.', [
                'module' => ['type' => 'string'],
            ], ['module']),
            $this->fn('search_records', 'Find records in a module. Results include app links to matching rows and attached file links when available. Supports free-text search, filters, sorting and a limit (max 25).', [
                'module' => ['type' => 'string'],
                'search' => ['type' => 'string', 'description' => 'Text to look for in any column'],
                'filters' => $filterSchema,
                'order_by' => ['type' => 'string'],
                'direction' => ['type' => 'string', 'description' => 'asc or desc'],
                'limit' => ['type' => 'integer'],
            ], ['module']),
            $this->fn('count_records', 'Count records in a module, with optional search and filters.', [
                'module' => ['type' => 'string'],
                'search' => ['type' => 'string'],
                'filters' => $filterSchema,
            ], ['module']),
            $this->fn('get_overview', 'Headline counts: pending deliveries, overdue deliveries, pending inspections, pending issuances.', new \stdClass()),
            $this->fn('find_purchase_order', 'Detailed lookup of a purchase order by PO number (partial ok): supplier, status, deliveries, IAR, invoice, a link to open the PO, and links to its attachments.', [
                'po_number' => ['type' => 'string'],
            ], ['po_number']),
            $this->fn('list_deliveries', 'List deliveries with supplier names, row links and attached file links. Filter by status, overdue only, supplier name, or due date range (e.g. due in May = due_from 2026-05-01, due_to 2026-05-31).', [
                'status' => ['type' => 'string', 'description' => 'e.g. PENDING, COMPLETE, CANCELLED'],
                'overdue_only' => ['type' => 'boolean'],
                'supplier' => ['type' => 'string'],
                'due_from' => ['type' => 'string', 'description' => 'Only deliveries due on/after this date, YYYY-MM-DD'],
                'due_to' => ['type' => 'string', 'description' => 'Only deliveries due on/before this date, YYYY-MM-DD'],
                'limit' => ['type' => 'integer'],
            ]),
            $this->fn('aggregate_records', 'Group a module by a column and compute count/sum/avg/max/min. Results include links to matching app pages when available. Use for ANY "which X has the highest/lowest/most" or "total per X" question. For count no column is needed.', [
                'module' => ['type' => 'string'],
                'group_by' => ['type' => 'string', 'description' => 'Column to group by, e.g. office_code'],
                'metric' => ['type' => 'string', 'description' => 'count, sum, avg, max or min'],
                'column' => ['type' => 'string', 'description' => 'Numeric column for sum/avg/max/min (e.g. qty or total_amount). Not needed for count.'],
                'search' => ['type' => 'string'],
                'filters' => $filterSchema,
                'direction' => ['type' => 'string', 'description' => 'desc (default, highest first) or asc'],
                'limit' => ['type' => 'integer'],
            ], ['module', 'group_by', 'metric']),
            $this->fn('list_records_with_attachments', 'List records that have at least one attached file, with a link to each record and to each file. Default module is serve_po (purchase orders). Use for "which purchase orders have attachments".', [
                'module' => ['type' => 'string', 'description' => 'Default serve_po'],
                'limit' => ['type' => 'integer'],
            ]),
            $this->fn('summarize_module', 'Compute summary statistics for a module over a period so you can write an analysis: record count, totals/averages of money columns, breakdowns by chosen columns with % shares, monthly trend, comparison with the previous period, and the largest records with links. Use for ANY summarize / analyze / insights / trends / breakdown / report request about system data. Never list raw records for those.', [
                'module' => ['type' => 'string'],
                'date_column' => ['type' => 'string', 'description' => 'Main date column used for the period and trend (required if date_from/date_to is given)'],
                'date_from' => ['type' => 'string', 'description' => 'Start date, YYYY-MM-DD (inclusive)'],
                'date_to' => ['type' => 'string', 'description' => 'End date, YYYY-MM-DD (inclusive)'],
                'amount_columns' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Up to 3 numeric/money columns to total. The first one is the main amount.'],
                'group_by_columns' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Up to 3 columns to break the data down by (e.g. status, office_code, supplier)'],
                'search' => ['type' => 'string', 'description' => 'Optional text to look for in any column'],
                'filters' => $filterSchema,
            ], ['module']),
        ];

        if ($this->webEnabled()) {
            $tools[] = $this->fn('web_search', 'Search the internet for live or recent information that is NOT in the system data: news, weather, prices, scores, recent events, or anything newer than your knowledge. Do not use it for questions about SMIS records.', [
                'query' => ['type' => 'string', 'description' => 'Short search query'],
            ], ['query']);
        }

        return $tools;
    }

    private function fn(string $name, string $desc, $props, array $required = []): array
    {
        $params = ['type' => 'object', 'properties' => $props];
        if ($required) {
            $params['required'] = $required;
        }

        return ['type' => 'function', 'function' => [
            'name' => $name,
            'description' => $desc,
            'parameters' => $params,
        ]];
    }

    private function runTool(string $name, array $args): array
    {
        return match ($name) {
            'list_modules'        => $this->listModules(),
            'describe_module'     => $this->describeModule((string) ($args['module'] ?? '')),
            'search_records'      => $this->searchRecords($args),
            'count_records'       => $this->countRecords($args),
            'get_overview'        => $this->getOverview(),
            'find_purchase_order' => $this->findPurchaseOrder((string) ($args['po_number'] ?? '')),
            'list_deliveries'     => $this->listDeliveries($args),
            'aggregate_records'   => $this->aggregateRecords($args),
            'list_records_with_attachments' => $this->recordsWithAttachments($args),
            'summarize_module'    => $this->summarizeModule($args),
            'web_search'          => $this->webSearch($args),
            default               => ['error' => "Unknown tool: {$name}"],
        };
    }

    // ------------------------------------------------------------------
    // Live web search (Tavily). Only reachable when a key is configured.
    // ------------------------------------------------------------------
    private function webSearch(array $a): array
    {
        if (! $this->webEnabled()) {
            return ['error' => 'Web search is not set up.'];
        }

        $query = trim((string) ($a['query'] ?? ''));
        if ($query === '') {
            return ['error' => 'query is required.'];
        }

        try {
            $res = Http::withToken((string) config('services.tavily.key'))
                ->timeout(20)
                ->post('https://api.tavily.com/search', [
                    'query' => mb_substr($query, 0, 300),
                    'max_results' => 5,
                    'include_answer' => true,
                ]);
        } catch (\Throwable $e) {
            Log::error('Chatbot web search exception', ['error' => $e->getMessage()]);

            return ['error' => 'Web search failed.'];
        }

        if (! $res->successful()) {
            Log::error('Chatbot web search error', ['status' => $res->status(), 'body' => mb_substr($res->body(), 0, 300)]);

            return ['error' => 'Web search failed.'];
        }

        return [
            'answer' => mb_substr((string) $res->json('answer', ''), 0, 600),
            'results' => collect($res->json('results', []))
                ->take(5)
                ->map(fn ($r) => [
                    'title' => mb_substr((string) ($r['title'] ?? ''), 0, 100),
                    'site' => parse_url((string) ($r['url'] ?? ''), PHP_URL_HOST),
                    'snippet' => mb_substr((string) ($r['content'] ?? ''), 0, 400),
                ])
                ->values()
                ->all(),
        ];
    }

    // ------------------------------------------------------------------
    // Generic module tools (work on any table)
    // ------------------------------------------------------------------
    private function listModules(): array
    {
        return array_keys($this->modules());
    }

    /** Returns [table, visibleColumns] or null. Hides password/token-like columns. */
    private function resolve(string $key): ?array
    {
        if (! array_key_exists($key, $this->modules())) {
            return null;
        }

        $cols = collect(Schema::getColumnListing($key))
            ->reject(fn ($c) => preg_match('/password|token|secret|remember/i', $c))
            ->values()
            ->all();

        return $cols ? [$key, $cols] : null;
    }

    private function unknownModule(): array
    {
        return ['error' => 'Unknown module.', 'valid_modules' => array_keys($this->modules())];
    }

    private function describeModule(string $module): array
    {
        $r = $this->resolve($module);

        return $r ? ['module' => $module, 'columns' => $r[1]] : $this->unknownModule();
    }

    private function filterError(array $cols, array $a): ?array
    {
        foreach (($a['filters'] ?? []) as $f) {
            $col = $f['column'] ?? '';
            if (! in_array($col, $cols, true)) {
                return ['error' => "Unknown column '{$col}'.", 'valid_columns' => $cols];
            }
            if (! in_array($f['op'] ?? '=', self::OPS, true)) {
                return ['error' => 'Bad operator.', 'allowed' => self::OPS];
            }
            if (! empty($f['compare_column']) && ! in_array($f['compare_column'], $cols, true)) {
                return ['error' => "Unknown compare_column '{$f['compare_column']}'.", 'valid_columns' => $cols];
            }
        }

        return null;
    }

    private function applyFilters($q, array $cols, array $a): void
    {
        // Hide soft-deleted rows, same as the rest of the system.
        if (in_array('deleted_at', $cols, true)) {
            $q->whereNull('deleted_at');
        }

        if (isset($a['search']) && $a['search'] !== '') {
            $term = '%' . $a['search'] . '%';
            $q->where(function ($w) use ($cols, $term) {
                foreach ($cols as $c) {
                    $w->orWhere($c, 'like', $term);
                }
            });
        }

        foreach (($a['filters'] ?? []) as $f) {
            $col = $f['column'];
            $op = $f['op'] ?? '=';

            if (! empty($f['compare_column'])) {
                $q->whereColumn($col, $op === 'like' ? '=' : $op, $f['compare_column']);
                continue;
            }

            $val = $f['value'] ?? null;

            // A plain date on a date column must also match 'YYYY-MM-DD HH:MM:SS' values.
            if ($op !== 'like' && is_string($val)
                && preg_match('/date|_at$/i', $col)
                && preg_match('/^\d{4}-\d{2}-\d{2}$/', $val)) {
                $q->whereDate($col, $op, $val);
                continue;
            }

            $q->where($col, $op, $op === 'like' ? "%{$val}%" : $val);
        }
    }

    private function searchRecords(array $a): array
    {
        $r = $this->resolve((string) ($a['module'] ?? ''));
        if (! $r) {
            return $this->unknownModule();
        }
        [$table, $cols] = $r;

        if ($err = $this->filterError($cols, $a)) {
            return $err;
        }

        $q = DB::table($table);
        $this->applyFilters($q, $cols, $a);

        $total = (clone $q)->count();
        $default = in_array('id', $cols, true) ? 'id' : $cols[0];
        $order = in_array($a['order_by'] ?? '', $cols, true) ? $a['order_by'] : $default;
        $dir = strtolower($a['direction'] ?? 'desc') === 'asc' ? 'asc' : 'desc';
        $limit = min(max((int) ($a['limit'] ?? 10), 1), 25);

        $rows = $q->orderBy($order, $dir)->limit($limit)->get();
        $attachmentsByRecord = $this->recordAttachments($table, $rows);

        return [
            'total_matches' => $total,
            'showing' => $rows->map(function ($row) use ($cols, $table, $attachmentsByRecord) {
                $row = (array) $row;
                $out = [];
                foreach ($cols as $c) {
                    $v = $row[$c] ?? null;
                    if ($v === null || $v === '') {
                        continue; // skip empty fields, saves tokens
                    }
                    $out[$c] = is_string($v) ? mb_substr($v, 0, 200) : $v;
                }
                $out['_url'] = $this->recordUrl($table, $row);
                $recordKey = self::RECORD_PAGES[strtolower($table)]['key'] ?? null;
                $recordId = $recordKey ? (string) ($row[$recordKey] ?? '') : '';
                $out['_attachments'] = $attachmentsByRecord[$recordId] ?? [];

                return $out;
            })->values(),
        ];
    }

    private function countRecords(array $a): array
    {
        $r = $this->resolve((string) ($a['module'] ?? ''));
        if (! $r) {
            return $this->unknownModule();
        }
        [$table, $cols] = $r;

        if ($err = $this->filterError($cols, $a)) {
            return $err;
        }

        $q = DB::table($table);
        $this->applyFilters($q, $cols, $a);

        return ['count' => $q->count()];
    }

    private function aggregateRecords(array $a): array
    {
        $r = $this->resolve((string) ($a['module'] ?? ''));
        if (! $r) {
            return $this->unknownModule();
        }
        [$table, $cols] = $r;

        if ($err = $this->filterError($cols, $a)) {
            return $err;
        }

        $group = (string) ($a['group_by'] ?? '');
        if (! in_array($group, $cols, true)) {
            return ['error' => "Unknown group_by '{$group}'.", 'valid_columns' => $cols];
        }

        $metric = strtolower((string) ($a['metric'] ?? 'count'));
        if (! in_array($metric, ['count', 'sum', 'avg', 'max', 'min'], true)) {
            return ['error' => 'metric must be count, sum, avg, max or min.'];
        }

        $col = (string) ($a['column'] ?? '');
        if ($metric !== 'count' && ! in_array($col, $cols, true)) {
            return ['error' => "Unknown column '{$col}'.", 'valid_columns' => $cols];
        }

        $expr = $metric === 'count'
            ? 'COUNT(*)'
            : strtoupper($metric) . '(' . DB::getQueryGrammar()->wrap($col) . ')';

        $q = DB::table($table);
        $this->applyFilters($q, $cols, $a);

        $dir = strtolower((string) ($a['direction'] ?? 'desc')) === 'asc' ? 'asc' : 'desc';
        $limit = min(max((int) ($a['limit'] ?? 10), 1), 25);

        $rows = $q->select($group)
            ->selectRaw("{$expr} as agg_value")
            ->groupBy($group)
            ->orderBy('agg_value', $dir)
            ->orderBy($group)
            ->limit($limit)
            ->get();

        // Office codes -> office names, so answers say "Registrar" and not a code.
        $names = [];
        if ($group === 'office_code' && Schema::hasTable('offices')) {
            $names = DB::table('offices')
                ->whereIn('office_code', $rows->pluck($group)->filter()->all())
                ->pluck('office_name', 'office_code')
                ->all();
        }

        return [
            'group_by' => $group,
            'metric' => $metric === 'count' ? 'count' : "{$metric} of {$col}",
            'order' => $dir === 'asc' ? 'lowest first' : 'highest first',
            'showing' => $rows->map(function ($x) use ($table, $group, $names) {
                $x = (array) $x;
                $key = $x[$group];
                $label = (string) $key;
                $name = $names[$key] ?? '';
                if ($name !== '' && strcasecmp($name, $label) !== 0) {
                    $label = "{$name} ({$key})";
                }
                $v = $x['agg_value'];

                return [
                    'label' => $label,
                    'agg_value' => is_numeric($v) ? round((float) $v, 2) : $v,
                    'url' => $this->aggregateRecordUrl($table, $group, $key),
                ];
            })->values(),
        ];
    }

    // ------------------------------------------------------------------
    // Analysis tool: SQL does the number crunching, the model writes the story
    // ------------------------------------------------------------------
    private function summarizeModule(array $a): array
    {
        $r = $this->resolve((string) ($a['module'] ?? ''));
        if (! $r) {
            return $this->unknownModule();
        }
        [$table, $cols] = $r;

        if ($err = $this->filterError($cols, $a)) {
            return $err;
        }

        $dateCol = (string) ($a['date_column'] ?? '');
        if ($dateCol !== '' && ! in_array($dateCol, $cols, true)) {
            return ['error' => "Unknown date_column '{$dateCol}'.", 'valid_columns' => $cols];
        }

        $amountCols = array_values(array_filter(
            array_slice((array) ($a['amount_columns'] ?? []), 0, 3),
            fn ($c) => is_string($c) && $c !== ''
        ));
        foreach ($amountCols as $c) {
            if (! in_array($c, $cols, true)) {
                return ['error' => "Unknown amount column '{$c}'.", 'valid_columns' => $cols];
            }
        }

        $groupCols = array_values(array_filter(
            array_slice((array) ($a['group_by_columns'] ?? []), 0, 3),
            fn ($c) => is_string($c) && $c !== ''
        ));
        foreach ($groupCols as $c) {
            if (! in_array($c, $cols, true)) {
                return ['error' => "Unknown group_by column '{$c}'.", 'valid_columns' => $cols];
            }
        }

        $from = $this->validDate($a['date_from'] ?? null);
        $to = $this->validDate($a['date_to'] ?? null);
        if (($from || $to) && $dateCol === '') {
            return ['error' => 'date_column is required when using date_from / date_to.', 'valid_columns' => $cols];
        }

        $grammar = DB::getQueryGrammar();

        // Same filters + period for every query below.
        $base = function (?string $f, ?string $t) use ($table, $cols, $a, $dateCol) {
            $q = DB::table($table);
            $this->applyFilters($q, $cols, $a);
            if ($dateCol !== '') {
                if ($f) {
                    $q->whereDate($dateCol, '>=', $f);
                }
                if ($t) {
                    $q->whereDate($dateCol, '<=', $t);
                }
            }

            return $q;
        };

        $q = $base($from, $to);
        $total = (clone $q)->count();
        $period = ($from || $to) ? (($from ?? '...') . ' to ' . ($to ?? '...')) : 'all dates';

        if ($total === 0) {
            return [
                'module' => $table,
                'period' => $period,
                'total_records' => 0,
                'note' => 'No records in this period.',
            ];
        }

        $out = [
            'module' => $table,
            'period' => $period,
            'total_records' => $total,
        ];

        // Totals for the money columns.
        $stats = [];
        foreach ($amountCols as $c) {
            $w = $grammar->wrap($c);
            $row = (clone $q)->selectRaw("SUM({$w}) as s, AVG({$w}) as a, MAX({$w}) as mx, MIN({$w}) as mn, COUNT({$w}) as n")->first();
            $stats[$c] = [
                'sum' => round((float) ($row->s ?? 0), 2),
                'average' => round((float) ($row->a ?? 0), 2),
                'max' => round((float) ($row->mx ?? 0), 2),
                'min' => round((float) ($row->mn ?? 0), 2),
                'records_without_value' => $total - (int) ($row->n ?? 0),
            ];
        }
        if ($stats) {
            $out['amount_stats'] = $stats;
        }

        $mainAmount = $amountCols[0] ?? null;
        $mainSum = $mainAmount ? $stats[$mainAmount]['sum'] : null;

        // Breakdowns: top groups with count, share and (if available) amount.
        $breakdowns = [];
        foreach ($groupCols as $g) {
            $sel = (clone $q)->select($g)->selectRaw('COUNT(*) as n');
            if ($mainAmount) {
                $sel->selectRaw('SUM(' . $grammar->wrap($mainAmount) . ') as amt');
            }
            $rows = $sel->groupBy($g)->orderByDesc('n')->limit(8)->get();
            $distinct = (clone $q)->distinct()->count($g);

            $names = [];
            if ($g === 'office_code' && Schema::hasTable('offices')) {
                $names = DB::table('offices')
                    ->whereIn('office_code', $rows->pluck($g)->filter()->all())
                    ->pluck('office_name', 'office_code')
                    ->all();
            }

            $shownCount = 0;
            $items = $rows->map(function ($x) use ($g, $names, $total, $mainAmount, $mainSum, &$shownCount) {
                $x = (array) $x;
                $key = $x[$g];
                $label = ($key === null || $key === '') ? '(blank)' : (string) $key;
                $name = $names[$key] ?? '';
                if ($name !== '' && strcasecmp($name, $label) !== 0) {
                    $label = "{$name} ({$key})";
                }
                $shownCount += (int) $x['n'];

                $item = [
                    'value' => $label,
                    'records' => (int) $x['n'],
                    'share_of_records_pct' => round(((int) $x['n']) / $total * 100, 1),
                ];
                if ($mainAmount) {
                    $amt = round((float) ($x['amt'] ?? 0), 2);
                    $item['amount'] = $amt;
                    $item['share_of_amount_pct'] = $mainSum ? round($amt / $mainSum * 100, 1) : null;
                }

                return $item;
            })->values()->all();

            $breakdowns[$g] = [
                'distinct_values' => $distinct,
                'top' => $items,
                'records_in_other_values' => max($total - $shownCount, 0),
            ];
        }
        if ($breakdowns) {
            $out['breakdowns'] = $breakdowns;
        }

        // Monthly trend (only useful when the period spans more than ~1 month).
        $span = ($from && $to) ? Carbon::parse($from)->diffInDays(Carbon::parse($to)) : null;
        if ($dateCol !== '' && ($span === null || $span > 45)) {
            $expr = $this->monthExpr($dateCol);
            $sel = (clone $q)->whereNotNull($dateCol)->selectRaw("{$expr} as ym, COUNT(*) as n");
            if ($mainAmount) {
                $sel->selectRaw('SUM(' . $grammar->wrap($mainAmount) . ') as amt');
            }
            $months = $sel->groupBy('ym')->orderByDesc('ym')->limit(12)->get()->reverse()->values();

            $out['monthly_trend'] = $months->map(function ($m) use ($mainAmount) {
                $m = (array) $m;
                $item = ['month' => $m['ym'], 'records' => (int) $m['n']];
                if ($mainAmount) {
                    $item['amount'] = round((float) ($m['amt'] ?? 0), 2);
                }

                return $item;
            })->all();
        }

        // Comparison with the previous period (previous calendar month for a full month).
        if ($from && $to && $dateCol !== '') {
            $f = Carbon::parse($from);
            $t = Carbon::parse($to);

            if ($f->day === 1 && $t->isSameDay($f->copy()->endOfMonth())) {
                $pf = $f->copy()->subMonthNoOverflow()->startOfMonth();
                $pt = $pf->copy()->endOfMonth();
            } else {
                $days = $f->diffInDays($t) + 1;
                $pt = $f->copy()->subDay();
                $pf = $pt->copy()->subDays($days - 1);
            }

            $pq = $base($pf->toDateString(), $pt->toDateString());
            $prevCount = (clone $pq)->count();

            $cmp = [
                'previous_period' => $pf->toDateString() . ' to ' . $pt->toDateString(),
                'previous_records' => $prevCount,
                'records_change_pct' => $this->pct($total, $prevCount),
            ];
            if ($mainAmount) {
                $prevSum = round((float) (clone $pq)->sum($mainAmount), 2);
                $cmp['previous_amount'] = $prevSum;
                $cmp['amount_change_pct'] = $this->pct((float) $mainSum, $prevSum);
            }
            $out['comparison'] = $cmp;
        }

        // Largest records, with links.
        if ($mainAmount) {
            $top = (clone $q)->orderByDesc($mainAmount)->limit(5)->get();
            $out['top_records'] = $top->map(function ($row) use ($table, $mainAmount) {
                $row = (array) $row;
                $label = null;
                foreach (self::TITLE_KEYS as $k) {
                    if (! empty($row[$k])) {
                        $label = (string) $row[$k];
                        break;
                    }
                }
                $label ??= (string) reset($row);

                return [
                    'label' => mb_substr($label, 0, 80),
                    'amount' => is_numeric($row[$mainAmount] ?? null) ? round((float) $row[$mainAmount], 2) : ($row[$mainAmount] ?? null),
                    '_url' => $this->recordUrl($table, $row),
                ];
            })->values()->all();
        }

        return $out;
    }

    /** 'YYYY-MM-DD' or null. */
    private function validDate($v): ?string
    {
        if (! is_string($v) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }

        try {
            return Carbon::parse($v)->toDateString();
        } catch (\Throwable $e) {
            return null;
        }
    }

    /** % change from $previous to $current (null when there is nothing to compare to). */
    private function pct(float $current, float $previous): ?float
    {
        return $previous == 0.0 ? null : round(($current - $previous) / $previous * 100, 1);
    }

    /** SQL expression that turns a date column into 'YYYY-MM' for the current DB driver. */
    private function monthExpr(string $col): string
    {
        $w = DB::getQueryGrammar()->wrap($col);

        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$w})",
            'pgsql' => "to_char({$w}, 'YYYY-MM')",
            default => "DATE_FORMAT({$w}, '%Y-%m')",
        };
    }

    private function recordsWithAttachments(array $a): array
    {
        $module = strtolower((string) ($a['module'] ?? 'serve_po'));
        $target = self::ATTACHABLE_MODELS[$module] ?? null;

        if (! $target || ! Schema::hasTable($module)) {
            return ['error' => 'That module has no attachments.', 'valid_modules' => array_keys(self::ATTACHABLE_MODELS)];
        }

        $modelClass = $target['model'];
        $key = $target['key'];
        $morphType = (new $modelClass())->getMorphClass();

        $ids = Attachment::query()
            ->whereIn('attachable_type', array_unique([$modelClass, $morphType]))
            ->distinct()
            ->pluck('attachable_id')
            ->map(fn ($id) => (string) $id)
            ->all();

        if (! $ids) {
            return ['total_matches' => 0, 'showing' => []];
        }

        $q = DB::table($module)->whereIn($key, array_slice($ids, 0, 500));
        if (Schema::hasColumn($module, 'deleted_at')) {
            $q->whereNull('deleted_at');
        }

        $total = (clone $q)->count();
        $limit = min(max((int) ($a['limit'] ?? 25), 1), 25);
        $rows = $q->orderBy($key, 'desc')->limit($limit)->get();
        $attachments = $this->recordAttachments($module, $rows);

        return [
            'total_matches' => $total,
            'showing' => $rows->map(function ($row) use ($module, $key, $attachments) {
                $row = (array) $row;
                $id = (string) ($row[$key] ?? '');

                return [
                    'label' => $id,
                    '_url' => $this->recordUrl($module, $row),
                    '_attachments' => $attachments[$id] ?? [],
                ];
            })->values(),
        ];
    }

    private function recordUrl(string $table, array $row): ?string
    {
        $page = self::RECORD_PAGES[strtolower($table)] ?? null;
        $key = $page['key'] ?? null;
        $id = $key ? ($row[$key] ?? null) : null;

        if (! $page || $id === null || $id === '') {
            return null;
        }

        return route($page['route'], ['highlight_id' => $id], false);
    }

    private function recordAttachments(string $table, $rows): array
    {
        $attachmentTarget = self::ATTACHABLE_MODELS[strtolower($table)] ?? null;
        $modelClass = $attachmentTarget['model'] ?? null;
        $key = $attachmentTarget['key'] ?? null;

        if (! $modelClass || ! $key) {
            return [];
        }

        $recordIds = $rows->pluck($key)->filter()->map(fn ($id) => (string) $id)->unique()->values();
        if ($recordIds->isEmpty()) {
            return [];
        }

        $morphType = (new $modelClass())->getMorphClass();

        return Attachment::query()
            ->whereIn('attachable_type', array_unique([$modelClass, $morphType]))
            ->whereIn('attachable_id', $recordIds)
            ->orderBy('id')
            ->get(['attachable_id', 'original_name', 'file_path'])
            ->groupBy(fn (Attachment $attachment) => (string) $attachment->attachable_id)
            ->map(fn ($attachments) => $attachments->map(fn (Attachment $attachment) => [
                'name' => trim(preg_replace('/[\r\n\[\]]+/', ' ', $attachment->original_name)),
                'url' => $attachment->url,
            ])->all())
            ->all();
    }

    private function markdownUrl(string $url): string
    {
        return str_replace([' ', '(', ')'], ['%20', '%28', '%29'], $url);
    }

    private function aggregateRecordUrl(string $table, string $group, $key): ?string
    {
        $table = strtolower($table);

        if ($key === null || $key === '') {
            return null;
        }

        if ($table === 'transactions' && in_array($group, ['stock_no', 'item_name', 'reference'], true)) {
            return route('transaction-logs.index', ['search' => $key], false);
        }

        if ($table === 'stock_items' && $group === 'item_name') {
            return route('stock-items.index', ['search' => $key], false);
        }

        $page = self::RECORD_PAGES[$table] ?? null;
        if ($page && $page['key'] === $group) {
            return route($page['route'], ['highlight_id' => $key], false);
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Specialised tools (PO / deliveries need relations + overdue logic)
    // ------------------------------------------------------------------
    private function getOverview(): array
    {
        $today = now()->startOfDay();

        $pending = Delivery::where('status', 'PENDING')->get();
        $overdue = $pending->filter(fn ($d) => $d->due_date
            && Carbon::parse($d->due_date)->startOfDay()->lt($today))->count();

        $notCancelled = function ($q) {
            $q->whereNull('po_step')->orWhere('po_step', '!=', 'CANCELLED');
        };

        return [
            'pending_deliveries' => $pending->count(),
            'overdue_deliveries' => $overdue,
            'pending_inspections' => ServePo::whereDoesntHave('inspectionEntries', fn ($q) => $q->whereNotNull('inspection_date'))
                ->where($notCancelled)->count(),
            'pending_issuances' => ServePo::whereNull('receipt_claimed_by')
                ->whereNull('items_claimed_by')
                ->where($notCancelled)->count(),
        ];
    }

    private function findPurchaseOrder(string $po): array
    {
        $po = trim($po);
        if ($po === '') {
            return ['error' => 'PO number is required.'];
        }

        $rows = ServePo::with(['supplier', 'deliveries', 'inspectionEntries', 'attachments'])
            ->where('po_number', 'like', "%{$po}%")
            ->limit(5)
            ->get();

        if ($rows->isEmpty()) {
            return ['matches' => [], 'note' => 'No purchase order found.'];
        }

        return [
            'matches' => $rows->map(fn ($p) => [
                'po_number' => $p->po_number,
                'url' => route('purchase-orders.index', ['highlight_id' => $p->po_number], false),
                'status' => $p->po_step ?? 'ONGOING',
                'supplier' => $p->supplier?->supplier_name,
                'attachments' => $p->attachments->map(fn ($attachment) => [
                    'name' => $attachment->original_name,
                    'url' => $attachment->url,
                ])->values(),
                'invoice_number' => $p->invoice_number,
                'iar_numbers' => $p->inspectionEntries->pluck('iar_number')->filter()->values(),
                'inspected' => $p->inspectionEntries->whereNotNull('inspection_date')->isNotEmpty(),
                'receipt_claimed_by' => $p->receipt_claimed_by,
                'items_claimed_by' => $p->items_claimed_by,
                'deliveries' => $p->deliveries->map(fn ($d) => [
                    'status' => $d->status,
                    'due_date' => $d->due_date,
                    'end_user' => $d->end_user,
                ])->values(),
            ])->values(),
        ];
    }

    private function listDeliveries(array $args): array
    {
        $limit = min(max((int) ($args['limit'] ?? 10), 1), 25);
        $today = now()->startOfDay();

        $query = Delivery::with('supplier');

        if (! empty($args['status'])) {
            $query->where('status', strtoupper($args['status']));
        }
        if (! empty($args['supplier'])) {
            $term = $args['supplier'];
            $query->whereHas('supplier', fn ($q) => $q->where('supplier_name', 'like', "%{$term}%"));
        }

        $rows = $query->get();

        if (! empty($args['overdue_only'])) {
            $rows = $rows->filter(fn ($d) => $d->status === 'PENDING'
                && $d->due_date
                && Carbon::parse($d->due_date)->startOfDay()->lt($today));
        }

        // Due date range, e.g. "due in May" -> due_from 2026-05-01, due_to 2026-05-31.
        $dueFrom = $this->validDate($args['due_from'] ?? null);
        $dueTo = $this->validDate($args['due_to'] ?? null);
        if ($dueFrom || $dueTo) {
            $fromDay = $dueFrom ? Carbon::parse($dueFrom)->startOfDay() : null;
            $toDay = $dueTo ? Carbon::parse($dueTo)->startOfDay() : null;

            $rows = $rows->filter(function ($d) use ($fromDay, $toDay) {
                if (! $d->due_date) {
                    return false;
                }

                $due = Carbon::parse($d->due_date)->startOfDay();

                return (! $fromDay || $due->gte($fromDay)) && (! $toDay || $due->lte($toDay));
            });
        }

        $showing = $rows->take($limit);
        $attachmentsByRecord = $this->recordAttachments(
            'delivery',
            $showing->map(fn ($delivery) => $delivery->getAttributes())
        );

        return [
            'total_matches' => $rows->count(),
            'showing' => $showing->map(fn ($d) => [
                'po_number' => $d->po_number,
                'supplier' => $d->supplier?->supplier_name,
                'status' => $d->status,
                'due_date' => $d->due_date,
                'end_user' => $d->end_user,
                '_url' => $this->recordUrl('delivery', $d->getAttributes()),
                '_attachments' => $attachmentsByRecord[(string) $d->delivery_id] ?? [],
            ])->values(),
        ];
    }
}