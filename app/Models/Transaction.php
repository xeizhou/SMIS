<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    protected $table = 'transactions';
    protected $primaryKey = 'transactionID';
    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'transaction_type',
        'fund_cluster',
        'transaction_date',
        'item_name',
        'unitID',
        'reference',
        'quantity',
        'office_code',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
    ];

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster', 'fund_cluster_id');
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class, 'office_code', 'office_code');
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unitID', 'unitID');
    }
}
