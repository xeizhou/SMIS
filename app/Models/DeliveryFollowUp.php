<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class DeliveryFollowUp extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Delivery Follow-ups';

    protected $fillable = [
        'delivery_id',
        'user_id',
        'notice_type',
        'follow_up_date',
        'remarks',
    ];

    protected $casts = [
        'follow_up_date' => 'datetime',
    ];

    public function getActivityUrl()
    {
        return route('delivery-follow-ups.index') . '?highlight_id=' . $this->getKey();
    }

    public function delivery()
    {
        return $this->belongsTo(Delivery::class, 'delivery_id', 'delivery_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
