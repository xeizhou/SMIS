<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $table = 'supplier_list';

    protected $primaryKey = 'supplier_id';

    public $timestamps = false; // source table has no created_at/updated_at

    protected $fillable = [
        'supplier_name',
        'contact_number',
        'email_address',
        'status',
    ];

    public function servePos(): HasMany
    {
        return $this->hasMany(ServePo::class, 'supplier_id');
    }

    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class, 'supplier_id');
    }

    public function poLetterMonitorings(): HasMany
    {
        return $this->hasMany(PoLetterMonitoring::class, 'supplier_id');
    }

    public function pirMonitorings(): HasMany
    {
        return $this->hasMany(PirMonitoring::class, 'supplier_id');
    }
}
