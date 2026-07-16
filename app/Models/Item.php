<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Item extends Model
{
    protected $table = 'items';
    protected $primaryKey = 'stockID';
    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'stock_no',
        'item_name',
        'description',
        'unitID',
    ];

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class, 'unitID', 'unitID');
    }

    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class, 'stock_no', 'stock_no');
    }
}
