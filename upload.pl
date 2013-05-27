#!/usr/bin/perl -wT 

use strict;
use CGI qw(standard -utf8);
use CGI::Carp qw(fatalsToBrowser);
use Data::Dumper;

my $cgi = new CGI();
my $upload_dir = 'xml';
my %filenames = ();

print $cgi->header(); # for debugging

for my $filename ($cgi->param()) {
	if ($filename =~ /^([-\@\w.]+)$/) {
		$filename = $1;
	}
	else {
		die "Bad filename";
	}

	open (DESTINATION_FILE, ">$upload_dir/$filename") or die "$!";
	binmode DESTINATION_FILE;
	print DESTINATION_FILE $cgi->param($filename);
	close DESTINATION_FILE;
}
