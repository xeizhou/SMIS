<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Supplier extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Supplier List';

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

    public function getActivityUrl()
    {
        return route('supplier.index') . '?highlight_id=' . $this->id;
    }
}
