<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeFileLocator extends Model
{
    use HasFactory;

    protected $table = 'employee_file_locator';

    protected $primaryKey = 'efr_id';

    protected $fillable = [
        'last_name',
        'first_name',
        'middle_name',
        'area',
        'status',
    ];
}