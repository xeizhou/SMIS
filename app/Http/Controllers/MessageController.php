<?php

namespace App\Http\Controllers;

use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    // Get conversation with a specific user
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
            ->get(['id', 'sender_id', 'receiver_id', 'body', 'created_at']);

        // mark incoming messages as read
        Message::where('sender_id', $user->id)
            ->where('receiver_id', $me->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    // Send a message
    public function store(Request $request, User $user)
    {
        $request->validate([
            'body' => 'required|string|max:2000',
        ]);

        $message = Message::create([
            'sender_id' => $request->user()->id,
            'receiver_id' => $user->id,
            'body' => $request->body,
        ]);

        return response()->json($message);
    }

    // Unread counts, grouped by sender — for badge dots
    public function unreadCounts(Request $request)
    {
        return Message::where('receiver_id', $request->user()->id)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as count')
            ->groupBy('sender_id')
            ->pluck('count', 'sender_id');
    }
}