<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FundCluster extends Model
{
    protected $table = 'fund_clusters';
    protected $primaryKey = 'fund_cluster_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'fund_cluster_id',
        'fund_description',
    ];

    public function stockItems(): HasMany
    {
        return $this->hasMany(StockItem::class, 'fund_cluster_id', 'fund_cluster_id');
    }

    public function servePos(): HasMany
    {
        return $this->hasMany(ServePo::class, 'fund_cluster_id', 'fund_cluster_id');
    }

    public function pirMonitorings(): HasMany
    {
        return $this->hasMany(PirMonitoring::class, 'fund_cluster', 'fund_cluster_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'fund_cluster', 'fund_cluster_id');
    }
}
