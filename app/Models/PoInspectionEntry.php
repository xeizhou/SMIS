<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PoInspectionEntry extends Model
{
    protected $table = 'po_inspection_entries';

    protected $fillable = [
        'po_number',
        'iar_number',
        'inspected_by',
        'inspection_date',
    ];

    protected $casts = [
        'inspection_date' => 'date',
    ];

    public function servePo()
    {
        return $this->belongsTo(ServePo::class, 'po_number', 'po_number');
    }
}
