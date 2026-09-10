<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;
use App\Traits\SerializesDatesWithoutTimezoneShift;

class Area extends Model
{
    use HasFactory, LogsActivity, SerializesDatesWithoutTimezoneShift;

    const LOG_NAME = 'Area';

    public function getActivityUrl()
    {
        $prefix = request()->is('rrppe-monitoring*') ? 'rrppe-monitoring' : 'rrsp-monitoring';
        return route("{$prefix}.areas.index", [
            'highlight_search' => $this->name,
            'highlight_id' => $this->getKey(),
        ]);
    }
    
    protected $table = 'areas';
    protected $primaryKey = 'areaID';    

    protected $fillable = ['name'];
}
