<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ClearanceOffice extends Model
{
    use HasFactory, LogsActivity;

    const LOG_NAME = 'Clearance Office';

    protected $table = 'clearance_offices';

    protected $fillable = ['clearance_office_name'];

    public function getActivityUrl()
    {
        return route('clearance.offices.index', [
            'highlight_search' => $this->clearance_office_name,
            'highlight_id' => $this->getKey(),
        ]);
    }

    public function clearances(): BelongsToMany
    {
        return $this->belongsToMany(
            Clearance::class,
            'clearance_clearance_office',
            'clearance_office_id',
            'clearance_id'
        );
    }
}