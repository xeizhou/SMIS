<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MessageController extends Controller
{
    public function show(Request $request, User $user)
    {
        $me = $request->user();

        $messages = Message::query()
            ->where(function ($q) use ($me, $user) {
                $q->where('sender_id', $me->id)->where('receiver_id', $user->id);
            })
            ->orWhere(function ($q) use ($me, $user) {
                $q->where('sender_id', $user->id)->where('receiver_id', $me->id);
            })
            ->orderBy('created_at')
            ->get()
            ->map(fn ($m) => $this->formatMessage($m));

        Message::where('sender_id', $user->id)
            ->where('receiver_id', $me->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function store(Request $request, User $user)
    {
        $request->validate([
            'body' => 'nullable|string|max:2000',
            'attachment' => 'nullable|file|max:10240|mimes:jpg,jpeg,png,gif,webp,pdf,doc,docx,xls,xlsx,zip,txt',
        ]);

        if (! $request->filled('body') && ! $request->hasFile('attachment')) {
            return response()->json(['message' => 'Message body or attachment is required.'], 422);
        }

        $data = [
            'sender_id' => $request->user()->id,
            'receiver_id' => $user->id,
            'body' => $request->input('body'),
        ];

        if ($request->hasFile('attachment')) {
            $file = $request->file('attachment');
            $path = $file->store('message-attachments', 'private');

            $data['attachment_path'] = $path;
            $data['attachment_name'] = $file->getClientOriginalName();
            $data['attachment_type'] = $file->getClientMimeType();
            $data['attachment_size'] = $file->getSize();
        }

        $message = Message::create($data);

        return response()->json($this->formatMessage($message));
    }

    public function attachment(Request $request, Message $message)
    {
        $me = $request->user();

        abort_unless(
            $message->sender_id === $me->id || $message->receiver_id === $me->id,
            403
        );

        abort_unless($message->attachment_path, 404);
        abort_unless(Storage::disk('private')->exists($message->attachment_path), 404);

        return Storage::disk('private')->response(
            $message->attachment_path,
            $message->attachment_name
        );
    }

    public function unreadCounts(Request $request)
    {
        return Message::where('receiver_id', $request->user()->id)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');
    }

    protected function formatMessage(Message $m): array
    {
        return [
            'id' => $m->id,
            'sender_id' => $m->sender_id,
            'receiver_id' => $m->receiver_id,
            'body' => $m->body,
            'attachment_url' => $m->attachment_url,
            'attachment_name' => $m->attachment_name,
            'attachment_type' => $m->attachment_type,
            'attachment_size' => $m->attachment_size,
            'created_at' => $m->created_at->toIso8601String(),
        ];
    }
}