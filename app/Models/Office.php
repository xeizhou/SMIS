<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\LogsActivity;

class Office extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Offices';

    protected $table = 'offices';

    protected $primaryKey = 'office_code';

    protected $keyType = 'string';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = [
        'office_code',
        'office_name',
        'entity_name',
        'office_head',
         'email',
    ];

    public function getRouteKeyName(): string
    {
        return 'office_code';
    }

    public function clearances(): HasMany
    {
        return $this->hasMany(Clearance::class, 'office', 'office_code');
    }

    public function bonaVidaMonitorings(): HasMany
    {
        return $this->hasMany(BonaVidaMonitoring::class, 'office_code', 'office_code');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class, 'office_code', 'office_code');
    }

    public function getActivityUrl()
    {
        return route('offices.index') . '?highlight_id=' . $this->getKey();
    }
    
}
