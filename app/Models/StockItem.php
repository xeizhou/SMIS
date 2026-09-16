<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\LogsActivity;

class StockItem extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    const LOG_NAME = 'Stock Items';

    public function getActivityUrl()
    {
        return route('stock-items.index', [
            'highlight_search' => $this->stock_no,
            'highlight_id' => $this->getKey(),
        ]);
    }
    protected $table = 'stock_items';

    protected $primaryKey = 'stock_no';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = [
        'stock_no',
        'item_name',
        'description',
        'unitID',
        'fund_cluster_id',
        'is_pending_setup',
    ];

    protected $casts = [
        'is_pending_setup' => 'boolean',
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

    public function units()
    {
        return $this->belongsToMany(Unit::class, 'stock_item_unit', 'stock_no', 'unitID')
                    ->withPivot('is_default');
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }

    public function purchaseOrders(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
    {
        return $this->belongsToMany(
            ServePo::class,
            'serve_po_items',
            'stock_no',
            'po_number',
            'stock_no',
            'po_number'
        );
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'stock_no', 'stock_no');
    }
}