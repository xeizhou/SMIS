<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Traits\LogsActivity;

class Unit extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    const LOG_NAME = 'Units';

    protected $table = 'units';

    protected $primaryKey = 'unitID';

    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'unit_name',
        'unit_short_name',
    ];

    public function stockItems(): BelongsToMany
    {
        return $this->belongsToMany(StockItem::class, 'stock_item_unit', 'unitID', 'stock_no')
                    ->withPivot('is_default');
    }

    public function items(): HasMany
    {
        return $this->hasMany(Item::class, 'unitID', 'unitID');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'unitID', 'unitID');
    }

    public function getActivityUrl()
    {
        return route('units.index') . '?highlight_id=' . $this->getKey();
    }

    public function archiveMetadata(): MorphOne
    {
        return $this->morphOne(Archive::class, 'archivable');
    }
}