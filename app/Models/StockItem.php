<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class StockItem extends Model
{
    protected $table = 'stock_items';
    protected $primaryKey = 'stock_no';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'stock_no',
        'item_name',
        'description',
        'unitID',
        'on_hand_quantity',
        're_order_point',
        'fund_cluster_id',
        'link',
        'remarks',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unitID', 'unitID');
    }

    public function fundCluster(): BelongsTo
    {
        return $this->belongsTo(FundCluster::class, 'fund_cluster_id', 'fund_cluster_id');
    }

    public function item(): HasOne
    {
        return $this->hasOne(Item::class, 'stock_no', 'stock_no');
    }
}
