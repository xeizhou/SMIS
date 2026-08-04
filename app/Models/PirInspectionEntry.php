<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PirInspectionEntry extends Model
{
    protected $table = 'pir_inspection_entries';

    protected $fillable = [
        'pir_id',
        'iar_number',
        'inspected_by',
        'inspection_date',
    ];

    protected $casts = [
        'inspection_date' => 'date',
    ];

    public function pirMonitoring()
    {
        return $this->belongsTo(PirMonitoring::class, 'pir_id', 'pir_id');
    }
}
